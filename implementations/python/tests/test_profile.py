"""Independently authored security tests for the reviewed proposed profile."""
import copy
import hmac
import hashlib
import json
import multiprocessing
import queue as queue_module
import time
from contextlib import contextmanager
from unittest.mock import patch
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
    verify_record, b64, SchemaValidator,
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

    def test_profile_optional_allowlists_reject_malformed_containers_and_entries(self):
        malformed = ("test-channel", "deployment-bound-test-channel-process", "not-forbidden", "", None, True, 42, {"test-channel": True}, [""], [None], [42])
        for field in ("allowed_authentication_methods", "allowed_onward_disclosure"):
            for value in malformed:
                with self.subTest(field=field, value=value):
                    policy = copy.deepcopy(self.policy); policy[field] = value
                    self.assertCode("INVALID_POLICY", lambda: evaluate_policy(self.request, policy, stamp(self.now), receipt_preflight="available"))
                    with patch("context_layer_independent.profile.Ed25519PrivateKey") as signing_key:
                        self.assertCode("INVALID_POLICY", lambda: issue_bundle(self.request, policy, self.claims, stamp(self.now), self.key_id, self.seed.hex()))
                        signing_key.from_private_bytes.assert_not_called()

    def test_profile_optional_allowlists_keep_exact_match_and_absence_semantics(self):
        self.assertEqual(evaluate_policy(self.request, self.policy, stamp(self.now), receipt_preflight="available")["decision"], "allow")
        for field, value in (("allowed_authentication_methods", ["deployment-bound-test-channel-process"]), ("allowed_onward_disclosure", ["not-forbidden"])):
            with self.subTest(field=field):
                policy = copy.deepcopy(self.policy); policy[field] = value
                self.assertEqual(evaluate_policy(self.request, policy, stamp(self.now), receipt_preflight="available")["decision"], "deny")
                policy[field] = []
                self.assertEqual(evaluate_policy(self.request, policy, stamp(self.now), receipt_preflight="available")["decision"], "deny")
        policy = copy.deepcopy(self.policy)
        del policy["allowed_authentication_methods"]
        del policy["allowed_onward_disclosure"]
        self.assertEqual(evaluate_policy(self.request, policy, stamp(self.now), receipt_preflight="available")["decision"], "allow")

    def test_profile_unsupported_transform_fails_before_bundle_signing(self):
        for transform in ("encrypt:project.deadline", "unknown:project.deadline", "truncate:project.deadline:0"):
            with self.subTest(transform=transform):
                policy = copy.deepcopy(self.policy)
                policy["transforms"] = {"project.deadline": [transform]}
                self.assertCode("SCHEMA_INVALID", lambda: evaluate_policy(self.request, policy, stamp(self.now), receipt_preflight="available"))
                with patch("context_layer_independent.profile.Ed25519PrivateKey") as signing_key:
                    self.assertCode("SCHEMA_INVALID", lambda: issue_bundle(self.request, policy, self.claims, stamp(self.now), self.key_id, self.seed.hex()))
                    signing_key.from_private_bytes.assert_not_called()

    def test_profile_all_authorizing_collection_shapes_match_core_boundary(self):
        fields = ("allowed_subjects", "allowed_requesters", "allowed_clients", "allowed_authentication_methods", "allowed_recipients", "allowed_onward_disclosure", "allowed_purpose_codes", "allowed_tasks", "allowed_selectors", "allowed_actions", "approval_required_selectors", "approval_required_actions")
        for field in fields:
            for invalid in ({"test-channel": True}, "test-channel", None, True, [42], [""]):
                with self.subTest(field=field, value=invalid):
                    policy = copy.deepcopy(self.policy); policy[field] = invalid
                    self.assertCode("INVALID_POLICY", lambda: evaluate_policy(self.request, policy, stamp(self.now), receipt_preflight="available"))

    def test_profile_malformed_transform_containers_never_reach_signing(self):
        malformed = (None, [], "redact:project.deadline", {"project.deadline": {}}, {"project.deadline": {"truncate:project.deadline:5": False}}, {"project.deadline": None}, {"project.deadline": "compress:task-facts"}, {"project.deadline": [42]}, {"project.deadline": [None]}, {"project.deadline": [""]}, {"project.owner": {}}, {"": []}, {42: []})
        for value in malformed:
            with self.subTest(value=value):
                policy = copy.deepcopy(self.policy); policy["transforms"] = value
                with patch("context_layer_independent.profile.Ed25519PrivateKey") as signing_key:
                    self.assertCode("INVALID_POLICY", lambda: issue_bundle(self.request, policy, self.claims, stamp(self.now), self.key_id, self.seed.hex()))
                    signing_key.from_private_bytes.assert_not_called()

    def test_profile_supported_transform_families_preserve_their_effects(self):
        policy = copy.deepcopy(self.policy)
        policy["transforms"] = {"project.deadline": ["truncate:project.deadline:10", "truncate:project.deadline:5"]}
        bundle = issue_bundle(self.request, policy, self.claims, stamp(self.now), self.key_id, self.seed.hex())["bundle"]
        self.assertEqual(bundle["context"][0]["claim"], self.claims[0]["claim"][:5])
        self.assertEqual(bundle["context"][0]["value"], self.claims[0]["value"][:5])
        policy["transforms"] = {"project.deadline": ["compress:task-facts"]}
        claims = copy.deepcopy(self.claims); claims[0]["claim"] = "  Synthetic\t  context\n here  "
        bundle = issue_bundle(self.request, policy, claims, stamp(self.now), self.key_id, self.seed.hex())["bundle"]
        self.assertEqual(bundle["context"][0]["claim"], "Synthetic context here")
        self.assertEqual(bundle["context"][0]["value"], claims[0]["value"])
        request = copy.deepcopy(self.request); request["selectors"].append({"predicate": "project.owner"})
        claims.append({"claim": "Approved owner", "predicate": "project.owner", "value": "synthetic owner", "confidence": 0.5, "provenance_refs": ["vault://independent/events/owner"]})
        policy["transforms"] = {"project.deadline": ["redact:project.deadline"]}
        bundle = issue_bundle(request, policy, claims, stamp(self.now), self.key_id, self.seed.hex())["bundle"]
        self.assertEqual([claim["predicate"] for claim in bundle["context"]], ["project.owner"])
        self.assertNotIn(self.claims[0]["value"], json.dumps(bundle))

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

    def test_profile_blank_or_malformed_anchor_is_invalid_without_mutation(self):
        for index, raw in enumerate((b"\n", b"\n\n", b" \n", b"\t\r\n", b"{\n", b"null\n", b"[]\n")):
            with self.subTest(raw=raw):
                directory = Path(self.temp.name) / f"invalid-anchor-{index}"
                directory.mkdir()
                log_path, anchor_path = directory / "log.jsonl", directory / "anchor.jsonl"
                anchor_path.write_bytes(raw)
                self.assertCode("RECEIPT_ANCHOR_INVALID", lambda: AnchoredReceiptLog(log_path, anchor_path, self.seed))
                self.assertEqual(anchor_path.read_bytes(), raw)
                self.assertFalse(log_path.exists())
                self.assertFalse(Path(str(log_path) + ".lock").exists())

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

    def test_profile_log_reuses_validator_without_skipping_receipt_checks(self):
        receipts = [self.receipt(f"test.cache_{i}") for i in range(3)]
        original_lock = AnchoredReceiptLog.lock
        initialized_before_lock = []
        @contextmanager
        def observed_lock(store):
            initialized_before_lock.append(hasattr(store, "_validator"))
            with original_lock(store):
                yield
        with patch("context_layer_independent.profile.SchemaValidator", wraps=SchemaValidator) as factory:
            with patch.object(AnchoredReceiptLog, "lock", observed_lock):
                log = self.log()
                for receipt in receipts:
                    log.append(receipt)
                self.assertEqual(log.export(), receipts)
            self.assertEqual(factory.call_count, 1)
            self.assertTrue(all(initialized_before_lock))
            invalid = {key: value for key, value in receipts[0].items() if key not in ("id", "integrity")}
            invalid["not_an_allowed_receipt_field"] = True
            invalid = finalize_record(invalid, "urn:cl:receipt:")
            self.assertCode("SCHEMA_INVALID", lambda: log.append(invalid))
            self.assertEqual(log.export(), receipts)
            self.assertEqual(factory.call_count, 1)

    def test_profile_lock_timeout_keeps_owner_and_receipts_unchanged(self):
        log = self.log()
        before_anchor = log.anchor_path.read_bytes()
        lock_path = Path(str(log.path) + ".lock")
        lock_path.write_bytes(b"another-writer")
        try:
            with patch("context_layer_independent.profile.time.monotonic", side_effect=[0.0, 5.001]):
                self.assertCode("RECEIPT_LOCK_TIMEOUT", log.check_available)
            self.assertEqual(lock_path.read_bytes(), b"another-writer")
            self.assertEqual(log.anchor_path.read_bytes(), before_anchor)
            self.assertFalse(log.path.exists())
        finally:
            lock_path.unlink()

    def test_profile_multiple_processes_serialize_append(self):
        log = self.log()
        context = multiprocessing.get_context("spawn")
        ready, start = context.Queue(), context.Event()
        jobs = [context.Process(target=_append, args=(str(log.path), str(log.anchor_path), self.seed, self.receipt(f"test.op_{i}"), ready, start)) for i in range(6)]
        _run_ready_workers(jobs, ready, start)
        receipts = log.export()
        self.assertEqual(len(receipts), 6)
        self.assertEqual({receipt["operation"] for receipt in receipts}, {f"test.op_{i}" for i in range(6)})

    def test_profile_multiple_processes_single_consume(self):
        log = self.log(); envelope = json.dumps(self.envelope())
        context = multiprocessing.get_context("spawn")
        results, ready, start = context.Queue(), context.Queue(), context.Event()
        jobs = [context.Process(target=_consume, args=(str(log.path), str(log.anchor_path), self.seed, self.key_id, self.public, stamp(self.now), envelope, results, ready, start)) for _ in range(4)]
        try:
            _run_ready_workers(jobs, ready, start)
            outcomes = [results.get(timeout=5) for _ in jobs]
            self.assertEqual(outcomes.count("accepted"), 1)
            self.assertEqual(outcomes.count("BUNDLE_REPLAY"), 3)
        finally:
            results.close()
            results.join_thread()

    def test_profile_process_harness_reaps_children_before_failure_escapes(self):
        context = multiprocessing.get_context("spawn")
        ready, start = context.Queue(), context.Event()
        jobs = [context.Process(target=_ready_then_fail, args=(ready, start)),
                context.Process(target=_ready_then_wait, args=(ready, start))]
        with self.assertRaisesRegex(AssertionError, "worker"):
            _run_ready_workers(jobs, ready, start, completion_timeout=1.0)
        self.assertTrue(all(not job.is_alive() for job in jobs))
        self.assertTrue(all(job.exitcode is not None for job in jobs))


def _run_ready_workers(jobs, ready, start, *, startup_timeout=30.0, completion_timeout=30.0):
    """Bound import/startup separately and reap every child before test teardown.

    These test-cohort budgets do not change the production five-second lock
    acquisition limit. A readiness barrier makes append contention explicit on
    every OS, including Linux, which would otherwise default to fork.
    """
    started = []
    try:
        for job in jobs:
            job.start()
            started.append(job)
        deadline = time.monotonic() + startup_timeout
        ready_count = 0
        while ready_count < len(jobs):
            if any(job.exitcode is not None and job.exitcode != 0 for job in started):
                raise AssertionError("worker failed during startup")
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise AssertionError("worker startup exceeded test-cohort budget")
            try:
                ready.get(timeout=min(0.1, remaining))
                ready_count += 1
            except queue_module.Empty:
                pass
        start.set()
        deadline = time.monotonic() + completion_timeout
        while any(job.is_alive() for job in started):
            if any(job.exitcode is not None and job.exitcode != 0 for job in started):
                raise AssertionError("worker failed during concurrent operation")
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise AssertionError("worker completion exceeded test-cohort budget")
            for job in started:
                job.join(timeout=min(0.05, max(0.0, deadline - time.monotonic())))
        if any(job.exitcode != 0 for job in started):
            raise AssertionError("worker exited unsuccessfully")
    finally:
        # A failed assertion must never remove files under a surviving child.
        for job in started:
            if job.is_alive():
                job.terminate()
        unreaped = []
        for job in started:
            job.join(timeout=5)
            if job.is_alive():
                job.kill()
                job.join(timeout=5)
            if job.is_alive():
                unreaped.append(job.name)
        ready.close()
        ready.join_thread()
        if unreaped:
            raise AssertionError("worker could not be reaped: " + ", ".join(unreaped))


def _ready(ready, start):
    ready.put(True)
    if not start.wait(35):
        raise AssertionError("worker start barrier was not released")


def _append(log_path, anchor_path, seed, receipt, ready, start):
    store = AnchoredReceiptLog(log_path, anchor_path, seed)
    _ready(ready, start)
    store.append(receipt)


def _consume(log_path, anchor_path, seed, key_id, public, clock, envelope, results, ready, start):
    store = AnchoredReceiptLog(log_path, anchor_path, seed)
    _ready(ready, start)
    try:
        consumer = ProfileConsumer(recipient="urn:test:recipient", key_id=key_id, public_key_hex=public, clock=clock, receipts=store)
        consumer.open(envelope)
        results.put("accepted")
    except ProtocolError as error:
        results.put(error.code)


def _ready_then_fail(ready, start):
    _ready(ready, start)
    raise SystemExit(7)


def _ready_then_wait(ready, start):
    _ready(ready, start)
    time.sleep(60)


if __name__ == "__main__": unittest.main()
