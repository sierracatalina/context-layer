"""Independently authored security tests for the reviewed proposed profile."""
import copy
import hmac
import hashlib
import json
import multiprocessing
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from context_layer_independent.core import ProtocolError, digest, finalize_record, stamp
from context_layer_independent.profile import (
    AnchoredReceiptLog, MemoryReceiptStore, ProfileConsumer, canonical_json,
    evaluate_policy, issue_bundle, make_receipt, strict_loads, validate_proposal,
    verify_record, b64,
)
import test_core


class ProfileTests(unittest.TestCase):
    make_authority = test_core.CoreTests.make_authority
    tearDown = test_core.CoreTests.tearDown
    assertCode = test_core.CoreTests.assertCode
    approval = test_core.CoreTests.approval
    def setUp(self):
        test_core.CoreTests.setUp(self)
        self.seed = bytes.fromhex("31" * 32)  # Public synthetic test seed.
        self.key_id = "urn:test:independent-signing-key"
        self.public = Ed25519PrivateKey.from_private_bytes(self.seed).public_key().public_bytes(Encoding.Raw, PublicFormat.Raw).hex()

    def envelope(self):
        return issue_bundle(self.request, self.policy, self.claims, stamp(self.now), self.key_id, self.seed.hex())

    def consumer(self, store=None, **kwargs):
        return ProfileConsumer(recipient="urn:test:recipient", key_id=self.key_id, public_key_hex=self.public, clock=stamp(self.now), receipts=store if store is not None else MemoryReceiptStore(), **kwargs)

    def log(self):
        return AnchoredReceiptLog(Path(self.temp.name) / "receipts.jsonl", Path(self.temp.name) / "anchor.jsonl", self.seed)

    def receipt(self, operation="test.first"):
        return make_receipt(operation=operation, actor="urn:test:actor", subject_ref="urn:cl:alias:test", clock=stamp(self.now), summary="Independent synthetic receipt.")

    def test_profile_bound_approval_transcript(self):
        self.request["requested_actions"].append("email.send")
        candidate = self.approval()
        args = (self.request, self.policy, stamp(self.now), candidate)
        self.assertEqual(evaluate_policy(*args, approval_verifier="absent", receipt_preflight="available")["approval_verification"], "verifier_missing")
        approved = evaluate_policy(*args, approval_verifier="authenticated", receipt_preflight="available")
        self.assertEqual(approved["decision"], "allow")
        verify_record(approved, "urn:cl:decision:")

    def test_profile_signature_verified_with_only_public_key(self):
        envelope = self.envelope()
        self.assertEqual(self.consumer().open(json.dumps(envelope)).context()[0]["value"], "2032-04-12")

    def test_profile_tampered_record_precedes_signature(self):
        envelope = self.envelope()
        envelope["bundle"]["context"][0]["value"] = "tampered"
        self.assertCode("RECORD_INTEGRITY_MISMATCH", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_rehashed_forgery_rejected(self):
        envelope = self.envelope()
        bundle = envelope["bundle"]
        bundle["capabilities"].append("email.send")
        envelope["bundle"] = finalize_record({k:v for k,v in bundle.items() if k not in ("id","integrity")}, "urn:cl:bundle:")
        self.assertCode("BUNDLE_AUTHENTICATION_FAILED", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_malformed_signature_metadata_classified_before_crypto(self):
        for invalid in ("", None, 42, "A" * 85, "A" * 87, "=" * 86):
            with self.subTest(signature=invalid):
                envelope = self.envelope(); envelope["authentication"]["sig"] = invalid
                self.assertCode("INVALID_BUNDLE_AUTHENTICATION", lambda: self.consumer().open(json.dumps(envelope)))
        envelope = self.envelope(); envelope["authentication"]["sig"] = "A" * 86
        self.assertCode("BUNDLE_AUTHENTICATION_FAILED", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_integer_valued_policy_numbers_accept_decimal_spelling(self):
        self.policy["maximum_retention"]["max_seconds"] = 180.0
        self.assertEqual(evaluate_policy(self.request, self.policy, stamp(self.now), receipt_preflight="available")["decision"], "allow")
        self.policy["maximum_retention"]["max_seconds"] = True
        self.assertCode("INVALID_POLICY", lambda: evaluate_policy(self.request, self.policy, stamp(self.now), receipt_preflight="available"))

    def test_profile_numeric_envelope_version_accepts_one_point_zero_not_boolean(self):
        envelope = self.envelope(); envelope["envelope_version"] = 1.0
        self.assertEqual(self.consumer().open(json.dumps(envelope)).context()[0]["value"], "2032-04-12")
        envelope["envelope_version"] = True
        self.assertCode("INVALID_AUTHENTICATED_BUNDLE", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_json_parser_has_binary64_number_semantics(self):
        self.assertEqual(canonical_json(strict_loads('[9007199254740992,100000000000000000000,9007199254740993,1e21]')), '[9007199254740992,100000000000000000000,9007199254740992,1e+21]')
        self.assertCode("INVALID_JSON", lambda: strict_loads('1e999'))

    def test_profile_pending_denials_omit_ordinary_scope_and_preserve_groups(self):
        self.request["selectors"] = [{"predicate":"project.sensitive"}, {"predicate":"project.deadline"}, {"predicate":"private.note"}]
        self.request["requested_actions"] = ["email.send", "model.generate_text", "email.delete"]
        decision = evaluate_policy(self.request, self.policy, stamp(self.now), receipt_preflight="available")
        self.assertEqual(decision["decision"], "needs_approval")
        self.assertEqual(decision["granted_selectors"], [])
        self.assertEqual(decision["granted_actions"], [])
        self.assertEqual(decision["denied_selectors"], [{"predicate":"private.note"},{"predicate":"project.sensitive"}])
        self.assertEqual(decision["denied_actions"], ["email.delete", "email.send"])
        self.request["recipient"]["principal"] = "urn:test:unapproved"
        denied = evaluate_policy(self.request, self.policy, stamp(self.now), receipt_preflight="available")
        self.assertEqual(denied["decision"], "deny")
        self.assertEqual(denied["denied_selectors"], self.request["selectors"])
        self.assertEqual(denied["denied_actions"], self.request["requested_actions"])

    def test_profile_wrong_signature_rejected(self):
        envelope = self.envelope()
        envelope["authentication"]["sig"] = "A" * 86
        self.assertCode("BUNDLE_AUTHENTICATION_FAILED", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_unknown_authority_rejected(self):
        envelope = self.envelope()
        envelope["authentication"]["kid"] = "urn:test:other"
        self.assertCode("UNTRUSTED_BUNDLE_AUTHORITY", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_authentication_forbidden_inside_bundle(self):
        envelope = self.envelope()
        bundle = envelope["bundle"]
        unsigned = {k:v for k,v in bundle.items() if k not in ("id","integrity")}
        unsigned["authentication"] = envelope["authentication"]
        envelope["bundle"] = finalize_record(unsigned, "urn:cl:bundle:")
        self.assertCode("SCHEMA_INVALID", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_extra_envelope_key_rejected(self):
        envelope = self.envelope(); envelope["extension"] = True
        self.assertCode("INVALID_AUTHENTICATED_BUNDLE", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_hmac_not_implicitly_enabled(self):
        envelope = self.envelope(); envelope["authentication"] = {"algorithm":"hmac-sha256","key_id":self.key_id,"mac":"A"*43}
        self.assertCode("INVALID_BUNDLE_AUTHENTICATION", lambda: self.consumer().open(json.dumps(envelope)))

    def test_profile_legacy_hmac_requires_explicit_opt_in(self):
        envelope = self.envelope()
        legacy_key = bytes.fromhex("4f" * 32)
        envelope["authentication"] = {"algorithm": "hmac-sha256", "key_id": self.key_id, "mac": b64(hmac.new(legacy_key, canonical_json(envelope["bundle"]).encode("utf-8"), hashlib.sha256).digest())}
        self.assertCode("INVALID_BUNDLE_AUTHENTICATION", lambda: self.consumer().open(json.dumps(envelope)))
        session = self.consumer(legacy_hmac=True, legacy_key=legacy_key).open(json.dumps(envelope))
        self.assertEqual(session.context()[0]["value"], "2032-04-12")
        self.assertCode("BUNDLE_AUTHENTICATION_FAILED", lambda: self.consumer(legacy_hmac=True, legacy_key=bytes.fromhex("50" * 32)).open(json.dumps(envelope)))
        self.assertEqual(self.envelope()["authentication"]["algorithm"], "Ed25519")

    def test_profile_revocation_errors_fail_closed(self):
        serialized = json.dumps(self.envelope())
        self.assertCode("BUNDLE_REVOKED", lambda: self.consumer(revocation="revoked").open(serialized))
        self.assertCode("REVOCATION_CHECK_FAILED", lambda: self.consumer(revocation="error").open(serialized))

    def test_profile_replay_survives_fresh_consumer(self):
        serialized = json.dumps(self.envelope()); store = self.log()
        self.consumer(store).open(serialized)
        fresh_log = self.log()
        self.assertCode("BUNDLE_REPLAY", lambda: self.consumer(fresh_log).open(serialized))

    def test_profile_session_expiry_rechecked(self):
        consumer = self.consumer(); session = consumer.open(json.dumps(self.envelope()))
        consumer.clock = stamp(self.now + timedelta(minutes=5))
        self.assertCode("BUNDLE_EXPIRED", session.context)

    def test_profile_no_privileged_surface(self):
        session = self.consumer().open(json.dumps(self.envelope()))
        for member in ("vault", "commitMemory", "readPayload"):
            self.assertFalse(hasattr(session, member))

    def test_profile_missing_source_keeps_proposal_pending(self):
        session = self.consumer().open(json.dumps(self.envelope()))
        proposal = session.propose({"operation":"add_or_contradict", "proposed_claims":[{"predicate":"project.deadline","object":{"value":"2032-04-14","datatype":"date"},"confidence":0.5}],"provenance_handles":[],"rationale":"Independent pending proposal"})
        self.assertEqual(proposal["status"], "pending_validation")
        self.assertEqual(proposal["approval_requirement"], ["source_required", "user_confirm"])
        self.assertEqual(validate_proposal(proposal), {"valid": True})
        unsigned = {k:v for k,v in proposal.items() if k not in ("id","integrity")}; unsigned["raw_vault_write"] = True
        forbidden = finalize_record(unsigned, "urn:cl:proposal:")
        self.assertCode("MEMORY_PROPOSAL_CONTAINS_FORBIDDEN_MATERIAL", lambda: validate_proposal(forbidden))

    def test_profile_duplicate_json_members_rejected(self):
        self.assertCode("DUPLICATE_JSON_MEMBER", lambda: strict_loads('{"x":1,"x":2}'))

    def test_profile_anchor_required(self):
        self.assertCode("RECEIPT_ANCHOR_REQUIRED", lambda: AnchoredReceiptLog(Path(self.temp.name) / "missing.jsonl"))

    def test_profile_jsonl_splits_only_lf_bytes_inside_valid_unicode_strings(self):
        log = self.log()
        receipts = []
        for index, separator in enumerate(("\u2028", "\u2029", "\u0085", "\n", "\r")):
            with self.subTest(separator=hex(ord(separator))):
                receipt = make_receipt(operation=f"test.separator_{index}", actor="urn:test:actor", subject_ref="urn:cl:alias:test", clock=stamp(self.now), summary="before" + separator + "after", metadata={"note":"metadata" + separator + "value"})
                log.append(receipt); receipts.append(receipt)
                self.assertEqual(log.export(), receipts)
                self.assertEqual(self.log().export(), receipts)
                self.assertEqual(log.path.read_bytes().count(b"\n"), len(receipts))
                self.assertEqual(log.anchor_path.read_bytes().count(b"\n"), len(receipts) + 1)
        expected = log.path.read_bytes()
        self.log().check_available()
        self.assertEqual(log.path.read_bytes(), expected)

    def test_profile_anchor_detects_log_rollback(self):
        log = self.log(); log.append(self.receipt()); log.append(self.receipt("test.second"))
        log.path.write_bytes(log.path.read_bytes().splitlines(keepends=True)[0])
        self.assertCode("RECEIPT_LOG_ROLLBACK", self.log)

    def test_profile_missing_anchor_never_bootstraps_nonempty_log(self):
        log = self.log(); log.append(self.receipt()); log.anchor_path.unlink()
        self.assertCode("RECEIPT_ANCHOR_MISSING", self.log)

    def test_profile_empty_existing_anchor_is_corrupt(self):
        log = self.log(); log.anchor_path.write_bytes(b"")
        self.assertCode("RECEIPT_ANCHOR_INVALID", self.log)

    def test_profile_anchor_signature_tamper_rejected(self):
        log = self.log(); anchor = json.loads(log.anchor_path.read_text()); anchor["sig"] = "ed25519:" + "A" * 86
        log.anchor_path.write_text(canonical_json(anchor) + "\n")
        self.assertCode("RECEIPT_ANCHOR_INVALID", self.log)

    def test_profile_rewrite_same_semantics_detected_by_exact_byte_hash(self):
        log = self.log(); log.append(self.receipt()); entry = json.loads(log.path.read_text())
        log.path.write_text(json.dumps(entry) + "\n")
        self.assertCode("RECEIPT_LOG_REWRITE", self.log)

    def test_profile_crash_suffix_fails_closed(self):
        log = self.log(); log.append(self.receipt()); previous_anchor = log.anchor_path.read_bytes()
        log.append(self.receipt("test.second")); log.anchor_path.write_bytes(previous_anchor)
        self.assertCode("RECEIPT_LOG_UNANCHORED_SUFFIX", self.log)

    def test_profile_coordinated_rollback_is_explicit_limitation(self):
        log = self.log(); log.append(self.receipt())
        old_log, old_anchor = log.path.read_bytes(), log.anchor_path.read_bytes()
        log.append(self.receipt("test.second"))
        log.path.write_bytes(old_log); log.anchor_path.write_bytes(old_anchor)
        # Both old files are authentic. This MUST NOT be claimed as protected.
        self.assertEqual(len(self.log().export()), 1)

    def test_profile_multiple_processes_serialize_append(self):
        log = self.log()
        jobs = [multiprocessing.Process(target=_append, args=(str(log.path),str(log.anchor_path),self.seed,self.receipt(f"test.op_{i}"))) for i in range(6)]
        for job in jobs: job.start()
        for job in jobs:
            job.join(8); self.assertEqual(job.exitcode, 0)
        self.assertEqual(len(log.export()), 6)

    def test_profile_multiple_processes_single_consume(self):
        log = self.log(); envelope = json.dumps(self.envelope())
        queue = multiprocessing.Queue()
        jobs = [multiprocessing.Process(target=_consume, args=(str(log.path), str(log.anchor_path), self.seed, self.key_id, self.public, stamp(self.now), envelope, queue)) for _ in range(4)]
        for job in jobs: job.start()
        for job in jobs:
            job.join(8); self.assertEqual(job.exitcode, 0)
        results = [queue.get(timeout=1) for _ in jobs]
        self.assertEqual(results.count("accepted"), 1)
        self.assertEqual(results.count("BUNDLE_REPLAY"), 3)


def _append(log_path, anchor_path, seed, receipt):
    AnchoredReceiptLog(log_path, anchor_path, seed).append(receipt)


def _consume(log_path, anchor_path, seed, key_id, public, clock, envelope, queue):
    try:
        store = AnchoredReceiptLog(log_path, anchor_path, seed)
        consumer = ProfileConsumer(recipient="urn:test:recipient", key_id=key_id, public_key_hex=public, clock=clock, receipts=store)
        consumer.open(envelope)
        queue.put("accepted")
    except ProtocolError as error:
        queue.put(error.code)


if __name__ == "__main__": unittest.main()
