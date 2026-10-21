"""One-request JSON-lines adapter for the independent public conformance kit."""
import json
import sys
import tempfile
from pathlib import Path

from .core import ProtocolError, SchemaValidator, canonical_json, digest, finalize_record, purpose_code_valid
from .profile import (
    AnchoredReceiptLog, MemoryReceiptStore, ProfileConsumer, evaluate_policy,
    issue_bundle, make_receipt, strict_loads, validate_proposal,
)


def consumer(args, store):
    return ProfileConsumer(recipient=args["recipient"], key_id=args["key_id"], public_key_hex=args["public_key_hex"], clock=args["clock"], receipts=store, revocation=args.get("revocation", "clear"), legacy_hmac=args.get("legacy_hmac", False), legacy_key=bytes.fromhex(args["synthetic_legacy_key_hex"]) if args.get("legacy_hmac") is True and "synthetic_legacy_key_hex" in args else None)


def serialize(envelope):
    return envelope if isinstance(envelope, str) else json.dumps(envelope, ensure_ascii=True, separators=(",", ":"))


def caught(operation):
    try:
        operation()
    except ProtocolError as error:
        return error.code
    return None


def dispatch(args):
    if args.get("adapter_version") != "context-layer-conformance-adapter/1":
        raise ProtocolError("UNSUPPORTED_ADAPTER_VERSION")
    op = args.get("operation")
    if op == "validate_schema":
        expected = args["schema_name"].replace("-", "_")
        if expected not in ("context_request", "policy_decision", "scoped_context_bundle", "receipt", "memory_update_proposal"):
            raise ProtocolError("UNSUPPORTED_OBJECT_TYPE")
        return {"valid": SchemaValidator().validate_shape(args["value"], expected)}
    if op == "canonicalize":
        return {"canonical_json": canonical_json(args["value"]), "digest": digest(args["value"])}
    if op == "finalize_record":
        return finalize_record(args["unsigned"], args["id_prefix"])
    if op == "purpose_code":
        return {"valid": purpose_code_valid(args["value"])}
    if op == "evaluate_policy":
        return evaluate_policy(args["request"], args["policy"], args["clock"], args.get("approval"), args.get("approval_verifier", "absent"), args.get("receipt_preflight", "absent"))
    if op == "issue_bundle":
        return issue_bundle(args["request"], args["policy"], args["claims"], args["clock"], args["key_id"], args["synthetic_seed_hex"])
    if op == "verify_envelope":
        consumer(args, MemoryReceiptStore()).open(serialize(args["envelope"]))
        return {"accepted": True}
    if op == "memory_proposal":
        session = consumer(args, MemoryReceiptStore()).open(serialize(args["envelope"]))
        return session.propose(args["proposal"])
    if op == "validate_proposal":
        return validate_proposal(args["proposal"])
    if op == "replay":
        store = MemoryReceiptStore()
        first = consumer(args, store)
        serialized = serialize(args["envelope"])
        first.open(serialized)
        return {"first_accepted": True, "second_error": caught(lambda: first.open(serialized)), "restart_error": caught(lambda: consumer(args, store).open(serialized))}
    if op == "receipt_log":
        with tempfile.TemporaryDirectory(prefix="cl-independent-") as folder:
            log, anchor = Path(folder) / "receipts.jsonl", Path(folder) / "anchor.jsonl"
            seed = bytes.fromhex(args["synthetic_seed_hex"])
            store = AnchoredReceiptLog(log, anchor, seed)
            for operation in args["operations"]:
                store.append(make_receipt(operation=operation, actor="urn:agent:synthetic-receipt-vector", subject_ref="urn:cl:alias:synthetic-receipt-vector", clock=args["clock"], summary="Synthetic test-only receipt vector."))
            log_jsonl, anchor_jsonl = log.read_text(), anchor.read_text()
            missing = caught(lambda: AnchoredReceiptLog(Path(folder) / "missing.jsonl"))
            log.write_bytes(log.read_bytes().split(b"\n", 1)[0] + b"\n")
            rollback = caught(lambda: AnchoredReceiptLog(log, anchor, seed))
            return {"log_path": str(log.resolve()), "log_jsonl": log_jsonl, "anchor_jsonl": anchor_jsonl, "missing_anchor_error": missing, "rollback_error": rollback}
    raise ProtocolError("UNSUPPORTED_OPERATION")


def main():
    try:
        raw = sys.stdin.buffer.readline(4 * 1024 * 1024 + 1)
        if len(raw) > 4 * 1024 * 1024:
            raise ProtocolError("INPUT_TOO_LARGE")
        args = strict_loads(raw.decode("utf-8"))
        result = {"ok": True, "result": dispatch(args)}
    except ProtocolError as error:
        result = {"ok": False, "error": {"code": error.code}}
    except (KeyError, ValueError, TypeError, UnicodeError):
        result = {"ok": False, "error": {"code": "INVALID_ADAPTER_INPUT"}}
    except Exception:
        # Safe machine error. No potentially private input or traceback on stdout.
        result = {"ok": False, "error": {"code": "INTERNAL_ERROR"}}
    print(json.dumps(result, ensure_ascii=True, separators=(",", ":"), allow_nan=False))


if __name__ == "__main__":
    main()
