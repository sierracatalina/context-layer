#!/usr/bin/env python3
"""Standalone Python runner over unmodified four-file public corpus.

Uses only the independent implementation and the public bytes. A different
implementation's conformance runner can additionally invoke the JSONL adapter.
"""
import argparse
import copy
import hashlib
import hmac
import json
import tempfile
from pathlib import Path

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from context_layer_independent.adapter import dispatch
from context_layer_independent.core import ProtocolError, SchemaValidator, canonical_json, digest, finalize_record
from context_layer_independent.profile import MemoryReceiptStore, ProfileConsumer, b64

ROOT = Path(__file__).resolve().parent
BASE = {"adapter_version": "context-layer-conformance-adapter/1"}


def call(operation, **args):
    return dispatch({**BASE, "operation": operation, **args})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--vectors", type=Path, default=ROOT / "source-packet/test-vectors/v0.2")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    checks = []

    def check(name, operation, expected):
        try:
            actual = operation()
            status = "pass" if actual == expected else "fail"
            checks.append({"id": name, "status": status, "actual": actual, "expected": expected})
        except Exception as error:
            checks.append({"id": name, "status": "fail", "error": error.code if isinstance(error, ProtocolError) else type(error).__name__})

    def error_code(operation):
        try:
            operation()
        except ProtocolError as error:
            return error.code
        return None

    manifest = json.loads((args.vectors / "manifest.json").read_text())
    files = manifest["files"]
    check("manifest/original-vector-file-count", lambda: len(files), 4)
    for item in files:
        check("manifest/" + item["path"], lambda item=item: hashlib.sha256((args.vectors / item["path"]).read_bytes()).hexdigest(), item["sha256"])
    if any(c["status"] != "pass" for c in checks):
        raise SystemExit("Vector byte provenance check failed; refusing to execute modified inputs.")

    load = lambda name: json.loads((args.vectors / name).read_text())
    canonical = load("canonicalization.json")
    for case in canonical["cases"]:
        check("canonicalization/" + case["id"], lambda case=case: call("canonicalize", value=case["value"]), {"canonical_json": case["expected_canonical_json"], "digest": case["expected_digest"]})
    record = canonical["record_case"]
    generated = call("finalize_record", unsigned=record["unsigned"], id_prefix=record["id_prefix"])
    check("canonicalization/record-id", lambda: generated["id"], record["expected_id"])
    check("canonicalization/record-digest", lambda: generated["integrity"]["digest"], record["expected_digest"])
    check("canonicalization/record-preimage", lambda: canonical_json(record["unsigned"]), record["expected_canonical_json"])

    policy = load("policy-cases.json")
    for index, case in enumerate(policy["purpose_code_cases"]):
        check(f"policy/purpose-{index}", lambda case=case: call("purpose_code", value=case["code"])["valid"], case["expected_syntax_valid"])
    for case in policy["state_cases"]:
        request = {**copy.deepcopy(policy["base_request"]), **copy.deepcopy(case["request_patch"])}
        decision = call("evaluate_policy", request=request, policy=policy["base_policy"], clock=policy["fixed_time"])
        actual = {"decision": decision["decision"], "reason_codes": decision["reason_codes"], "retention_seconds": decision["retention"]["max_seconds"], "approval_verification": decision["approval_verification"]}
        check("policy/state-" + case["id"], lambda actual=actual: actual, case["expected"])
    approval_setup = policy["approval"]
    for case in approval_setup["cases"]:
        request = {**copy.deepcopy(policy["base_request"]), **copy.deepcopy(approval_setup["request_patch"])}
        approval = {**copy.deepcopy(approval_setup["candidate"]), "request_digest": digest(request), "policy_digest": digest(policy["base_policy"])}
        if case["mode"] == "expired":
            approval["expires_at"] = approval_setup["expired_candidate_expires_at"]
        decision = call("evaluate_policy", request=request, policy=policy["base_policy"], clock=policy["fixed_time"], approval=approval, approval_verifier="absent" if case["mode"] == "no_verifier" else "authenticated")
        actual = {"decision": decision["decision"], "reason": decision["reason_codes"][0], "verification": decision["approval_verification"]}
        expected = {"decision": case["expected_decision"], "reason": case["expected_reason"], "verification": case["expected_verification"]}
        if "expected_expires_at" in case:
            actual["expires_at"] = decision["expires_at"]; expected["expires_at"] = case["expected_expires_at"]
        check("policy/approval-" + case["id"], lambda actual=actual: actual, expected)

    exchange = load("exchange-security.json")
    envelope = call("issue_bundle", request=exchange["request"], policy=exchange["policy"], claims=exchange["claims"], clock=exchange["fixed_time"], key_id=exchange["authority_key_id"], synthetic_seed_hex=exchange["synthetic_test_only_ed25519_material_hex"])
    public = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(exchange["synthetic_test_only_ed25519_material_hex"])).public_key().public_bytes(Encoding.Raw, PublicFormat.Raw).hex()
    verification = {"clock": exchange["fixed_time"], "recipient": exchange["request"]["recipient"]["principal"], "key_id": exchange["authority_key_id"], "public_key_hex": public, "revocation": "clear"}
    check("exchange/decision", lambda: call("evaluate_policy", request=exchange["request"], policy=exchange["policy"], clock=exchange["fixed_time"], receipt_preflight="available")["decision"], exchange["expected"]["decision"])
    for name, actual in (("bundle_expires_at", envelope["bundle"]["expires_at"]), ("envelope_version", envelope["envelope_version"]), ("authentication_algorithm", envelope["authentication"]["algorithm"])):
        check("exchange/" + name, lambda actual=actual: actual, exchange["expected"][name])
    check("exchange/valid-envelope", lambda: call("verify_envelope", envelope=envelope, **verification), {"accepted": True})
    for index, fragment in enumerate(exchange["expected"]["forbidden_serialized_fragments"]):
        check(f"exchange/forbidden-fragment-{index}", lambda fragment=fragment: fragment in json.dumps(envelope), False)
    invalid = copy.deepcopy(envelope["bundle"]); invalid["authentication"] = envelope["authentication"]
    check("exchange/inner-auth-forbidden", lambda: call("validate_schema", schema_name="scoped-context-bundle", value=invalid)["valid"], not exchange["expected"]["inner_bundle_rejects_authentication"])
    tampered = copy.deepcopy(envelope); tampered["bundle"]["context"][0]["value"] = "tampered"
    check("exchange/tamper", lambda: error_code(lambda: call("verify_envelope", envelope=tampered, **verification)), exchange["expected"]["tampered_record_error"])
    forged = copy.deepcopy(envelope); unsigned = {k:v for k,v in forged["bundle"].items() if k not in ("id","integrity")}; unsigned["capabilities"] = sorted(set(unsigned["capabilities"] + ["email.send"])); unsigned["receipt_contract"]["required_operations"] = sorted(set(unsigned["receipt_contract"]["required_operations"] + ["email.send"])); forged["bundle"] = finalize_record(unsigned, "urn:cl:bundle:")
    check("exchange/forged-capability", lambda: error_code(lambda: call("verify_envelope", envelope=forged, **verification)), exchange["expected"]["forged_capability_error"])
    signature = copy.deepcopy(envelope); signature["authentication"]["sig"] = "A" * 86
    check("exchange/forged-signature", lambda: error_code(lambda: call("verify_envelope", envelope=signature, **verification)), exchange["expected"]["forged_sig_error"])
    raw = copy.deepcopy(envelope); unsigned = {k:v for k,v in raw["bundle"].items() if k not in ("id","integrity")}; unsigned["raw_vault_object"] = {"ref":"vault://synthetic-test-only/objects/forbidden"}; raw["bundle"] = finalize_record(unsigned,"urn:cl:bundle:")
    check("exchange/raw-material", lambda: error_code(lambda: call("verify_envelope", envelope=raw, **verification)), exchange["expected"]["raw_material_error"])

    legacy_key = bytes.fromhex("4f" * 32)  # Additional public synthetic setup.
    legacy = copy.deepcopy(envelope)
    legacy["authentication"] = {"algorithm": "hmac-sha256", "key_id": exchange["authority_key_id"], "mac": b64(hmac.new(legacy_key, canonical_json(legacy["bundle"]).encode("utf-8"), hashlib.sha256).digest())}
    check("exchange/legacy-disabled", lambda: error_code(lambda: call("verify_envelope", envelope=legacy, **verification)), "INVALID_BUNDLE_AUTHENTICATION")
    check("exchange/legacy-explicit-opt-in", lambda: call("verify_envelope", envelope=legacy, legacy_hmac=True, synthetic_legacy_key_hex=legacy_key.hex(), **verification), {"accepted": True})

    memory = load("receipt-memory-isolation.json")
    log = call("receipt_log", clock=memory["fixed_time"], synthetic_seed_hex=memory["synthetic_test_only_anchor_material_hex"], operations=memory["receipt_operations"])
    for name in ("missing_anchor_error", "rollback_error"):
        check("receipt/" + name, lambda name=name: log[name], memory["expected"][name])
    check("receipt/payload-minimized", lambda: all(json.loads(line)["receipt"]["payload_included"] is False for line in log["log_jsonl"].splitlines()), not memory["expected"]["payload_included"])
    candidate = {k: memory["memory_proposal"][k] for k in ("operation","proposed_claims","provenance_handles","rationale")}
    proposal = call("memory_proposal", envelope=envelope, proposal=candidate, **verification)
    check("memory/status", lambda: proposal["status"], memory["memory_proposal"]["expected_status"])
    check("memory/approval-requirements", lambda: proposal["approval_requirement"], memory["memory_proposal"]["expected_approval_requirements"])
    session = ProfileConsumer(recipient=verification["recipient"], key_id=verification["key_id"], public_key_hex=public, clock=verification["clock"], receipts=MemoryReceiptStore()).open(json.dumps(envelope))
    check("memory/consumer-surface", lambda: any(hasattr(session, member) for member in memory["memory_proposal"]["forbidden_session_members"]), False)
    unsigned = {k:v for k,v in proposal.items() if k not in ("id","integrity")}; unsigned[memory["memory_proposal"]["direct_write_field"]] = True
    direct = finalize_record(unsigned,"urn:cl:proposal:")
    check("memory/direct-write", lambda: error_code(lambda: call("validate_proposal", proposal=direct)), memory["memory_proposal"]["expected_direct_write_error"])

    for filename in ("valid-exchange", "valid-policy-decision", "invalid-policy-decision", "valid-memory-update-proposal", "invalid-memory-update-proposal", "invalid-secret-receipt"):
        fixture = json.loads((ROOT / "source-packet/protocol/fixtures" / (filename + ".json")).read_text())
        if filename == "valid-exchange": fixture = fixture["request"]
        check("fixture/" + filename, lambda fixture=fixture: call("validate_schema", schema_name=fixture["type"].replace("_","-"), value=fixture)["valid"], filename.startswith("valid"))

    passed = sum(c["status"] == "pass" for c in checks)
    report = {"format":"context-layer-independent-results/1", "implementation":"clean-room Python", "core_version":"context-layer/0.2-draft", "profile":"REVIEWED PROPOSED local-core-0.2-draft.1", "reference_commit":"0a8d016c822f38e8fc857422e133d0699c42a21f", "vector_sets":4, "separate_contract_fixtures":6, "passed":passed, "failed":len(checks)-passed, "conformance_claim":False, "unexercised_or_unsupported":["Version-1 receipt-anchor migration is not implemented.", "Not all RFC 8785 binary64 values, all schema instances, all core roles, network authentication, key custody, or discovery are exercised."], "checks":checks}
    rendered = json.dumps(report, indent=2) + "\n"
    if args.output: args.output.write_text(rendered)
    print(rendered, end="")
    return 0 if passed == len(checks) else 1


if __name__ == "__main__": raise SystemExit(main())
