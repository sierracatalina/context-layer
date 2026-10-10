"""Implementation of reviewed PROPOSED local-core-0.2-draft.1 prose only.

No reference implementation was viewed. The separate profile author inspected
reference behavior. This module is not evidence of full Core-Lite conformance.
"""
from __future__ import annotations

import base64
import copy
import hashlib
import hmac
import json
import math
import os
import re
import tempfile
import time
import uuid
from contextlib import contextmanager
from datetime import timedelta
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .core import (
    Authority, ProtocolError, SchemaValidator, VERSION, canonical_json, digest,
    finalize_record, parse_time, scan_forbidden, stamp, binary64_values,
    validate_policy_collections,
)

GENESIS_DIGEST = "sha256:" + "0" * 64
GENESIS_SIGNATURE = "ed25519:" + "0" * 86
MAX_ENVELOPE_BYTES = 2_097_152


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def unb64(value: str, size: int) -> bytes:
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", value):
        raise ProtocolError("BUNDLE_AUTHENTICATION_FAILED")
    try:
        result = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except (ValueError, TypeError):
        raise ProtocolError("BUNDLE_AUTHENTICATION_FAILED") from None
    if len(result) != size or b64(result) != value:
        raise ProtocolError("BUNDLE_AUTHENTICATION_FAILED")
    return result


def hash_bytes(value: bytes) -> str:
    return "sha256:" + hashlib.sha256(value).hexdigest()


def strict_loads(value: str):
    def members(pairs):
        result = {}
        for key, item in pairs:
            if key in result:
                raise ProtocolError("DUPLICATE_JSON_MEMBER")
            result[key] = item
        return result
    def reject(_):
        raise ProtocolError("INVALID_JSON")
    def integer(token):
        return binary64_values(int(token))
    def floating(token):
        result = float(token)
        if not math.isfinite(result):
            raise ProtocolError("INVALID_JSON")
        return result
    try:
        return json.loads(value, object_pairs_hook=members, parse_constant=reject,
                          parse_int=integer, parse_float=floating)
    except (ValueError, TypeError, RecursionError):
        raise ProtocolError("INVALID_JSON") from None


def verify_record(record: dict, prefix: str) -> None:
    if not isinstance(record, dict):
        raise ProtocolError("RECORD_INTEGRITY_MISMATCH")
    unsigned = {key: item for key, item in record.items() if key not in ("id", "integrity")}
    fingerprint = digest(unsigned)
    if record.get("integrity") != {"algorithm": "sha-256", "digest": fingerprint} or record.get("id") != prefix + fingerprint.split(":")[1]:
        raise ProtocolError("RECORD_INTEGRITY_MISMATCH")


class MemoryReceiptStore:
    """Explicit synthetic adapter store; not durable storage evidence."""
    def __init__(self):
        self.receipts = []

    def check_available(self):
        return None

    def append(self, receipt):
        verify_record(receipt, "urn:cl:receipt:")
        SchemaValidator().validate(receipt)
        if receipt["operation"] == "bundle.consume" and receipt["outcome"] == "success":
            if any(r["operation"] == "bundle.consume" and r["outcome"] == "success" and (r["actor"], r["bundle_ref"]) == (receipt["actor"], receipt["bundle_ref"]) for r in self.receipts):
                raise ProtocolError("RECEIPT_REPLAY_CONFLICT")
        self.receipts.append(copy.deepcopy(receipt))
        return copy.deepcopy(receipt)

    def export(self):
        return copy.deepcopy(self.receipts)


def make_receipt(*, operation, actor, subject_ref, clock, summary, outcome="success", request_ref=None, decision_ref=None, bundle_ref=None, policy_snapshot=None, input_digest=None, output_digest=None, metadata=None, supersedes_ref=None, started_at=None, completed_at=None):
    now = parse_time(clock) if isinstance(clock, str) else clock
    unsigned = {
        "spec_version": VERSION, "type": "receipt", "created_at": stamp(now),
        "issuer": {"id": "urn:cl:receipt-writer:local"}, "operation": operation,
        "actor": actor, "subject_ref": subject_ref, "request_ref": request_ref,
        "decision_ref": decision_ref, "bundle_ref": bundle_ref,
        "started_at": stamp(parse_time(started_at)) if started_at else stamp(now),
        "completed_at": stamp(parse_time(completed_at)) if completed_at else stamp(now),
        "outcome": outcome, "policy_snapshot": policy_snapshot,
        "input_digest": input_digest or digest(None), "output_digest": output_digest or digest(None),
        "user_summary": summary, "payload_included": False, "metadata": metadata or {},
    }
    if supersedes_ref is not None:
        unsigned["supersedes_ref"] = supersedes_ref
    result = finalize_record(unsigned, "urn:cl:receipt:")
    SchemaValidator().validate(result)
    return result


def _bundle_receipt(bundle, operation, clock, outcome="success", output=None):
    return make_receipt(operation=operation, actor=bundle["recipient"], subject_ref=bundle["subject_alias"], clock=clock, summary="Synthetic scoped operation receipt.", outcome=outcome, request_ref=bundle["request_ref"], decision_ref=bundle["decision_ref"], bundle_ref=bundle["id"], policy_snapshot=bundle["policy_snapshot"]["digest"], input_digest=digest(bundle), output_digest=digest(output))


def evaluate_policy(request, policy, clock, approval=None, approval_verifier="absent", receipt_preflight="absent"):
    # Setup exactly as the proposed profile: trusted host identity is explicit;
    # this adapter must never be presented as a user authentication service.
    check_policy(policy)
    now = parse_time(clock)
    class DecisionReceiptStore(MemoryReceiptStore):
        def append(self, receipt):
            # The core uses an independent record-ID strategy. Convert only this
            # test store boundary to the proposed profile's content record IDs.
            unsigned = {key: value for key, value in receipt.items() if key not in ("id", "integrity")}
            return super().append(finalize_record(unsigned, "urn:cl:receipt:"))
    receipts = DecisionReceiptStore() if receipt_preflight == "available" else None
    authority = Authority(policy, clock=lambda: now, receipts=receipts)
    verifier = None
    if approval_verifier == "authenticated":
        verifier = lambda candidate: candidate == approval and candidate.get("request_digest") == digest(request) and candidate.get("policy_digest") == digest(policy)
    elif approval_verifier == "rejected":
        verifier = lambda _: False
    elif approval_verifier != "absent":
        raise ProtocolError("INVALID_ADAPTER_SETUP")
    decision = authority.evaluate(request, authenticated_identity=copy.deepcopy(request.get("requester")), approval=approval, verify_approval=verifier)
    transforms = []
    for selector in decision["granted_selectors"]:
        transforms.extend(policy.get("transforms", {}).get(selector["predicate"], []))
    transforms = sorted(set(transforms), key=lambda x: x.encode("utf-16-be"))
    if len(transforms) > 64:
        raise ProtocolError("INVALID_POLICY")
    if decision["decision"] != "deny":
        # In a pending decision, ordinary scope is neither granted nor denied.
        # The state still prevents all issuance. Prose clarification c0103260.
        approved = decision["approval_verification"] == "verified"
        for source, ordinary, gated, target, selector in (
            (request["selectors"], policy["allowed_selectors"], policy.get("approval_required_selectors", []), "denied_selectors", True),
            (request["requested_actions"], policy["allowed_actions"], policy.get("approval_required_actions", []), "denied_actions", False),
        ):
            name = lambda item: item["predicate"] if selector else item
            outside = [item for item in source if name(item) not in ordinary and name(item) not in gated]
            pending = [item for item in source if name(item) in gated and not approved]
            decision[target] = copy.deepcopy(outside + pending)
    decision["transform_requirements"] = transforms
    decision["bundle_instructions"] = list(dict.fromkeys(policy.get("bundle_instructions", [])))
    if transforms and decision["decision"] == "allow":
        decision["decision"] = "allow_with_reductions"
        decision["reason_codes"] = ["SCOPE_REDUCED"]
    decision.pop("id", None)
    decision.pop("integrity", None)
    result = finalize_record(decision, "urn:cl:decision:")
    SchemaValidator().validate(result)
    return result


def check_policy(policy):
    validate_policy_collections(policy)
    mandatory = ("allowed_subjects", "allowed_requesters", "allowed_clients", "allowed_recipients", "allowed_purpose_codes", "allowed_tasks", "allowed_selectors", "allowed_actions")
    for name in mandatory:
        values = policy.get(name)
        if not isinstance(values, list) or any(not isinstance(v, str) or not v for v in values):
            raise ProtocolError("INVALID_POLICY")
    for ordinary, gated in (("allowed_selectors", "approval_required_selectors"), ("allowed_actions", "approval_required_actions")):
        if set(policy.get(ordinary, [])) & set(policy.get(gated, [])):
            raise ProtocolError("INVALID_POLICY")
    maximum = policy.get("maximum_retention", {})
    seconds = maximum.get("max_seconds")
    integer_seconds = type(seconds) in (int, float) and 0 < seconds <= 86400 and float(seconds).is_integer()
    if maximum.get("mode") not in ("ephemeral", "single_use") or not integer_seconds:
        raise ProtocolError("INVALID_POLICY")
    if not isinstance(policy.get("version"), str) or not policy["version"]:
        raise ProtocolError("INVALID_POLICY")


def issue_bundle(request, policy, claims, clock, key_id, synthetic_seed_hex):
    now = parse_time(clock)
    decision = evaluate_policy(request, policy, clock, receipt_preflight="available")
    verify_record(decision, "urn:cl:decision:")
    if decision["decision"] not in ("allow", "allow_with_reductions"):
        raise ProtocolError("DISCLOSURE_NOT_ALLOWED")
    if decision["request_digest"] != digest(request):
        raise ProtocolError("DECISION_BINDING_INVALID")
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/~-]{2,254}", key_id):
        raise ProtocolError("INVALID_KEY_ID")
    expiry = min(parse_time(request["expires_at"]), parse_time(decision["expires_at"]), now + timedelta(seconds=decision["retention"]["max_seconds"]))
    if expiry <= now:
        raise ProtocolError("BUNDLE_EXPIRED")
    selectors = {s["predicate"] for s in decision["granted_selectors"]}
    transforms = decision["transform_requirements"]
    provenance, context = {}, []
    for source in claims:
        predicate = source.get("predicate")
        if predicate not in selectors or f"redact:{predicate}" in transforms:
            continue
        refs = source.get("provenance_refs", source.get("provenance_handles"))
        if not isinstance(refs, list) or not refs or any(not isinstance(ref, str) or not ref for ref in refs):
            raise ProtocolError("PROVENANCE_MISSING")
        handles = []
        for ref in refs:
            fingerprint = digest({"source": ref}).split(":")[1]
            handle = "prov_" + fingerprint
            handles.append(handle)
            provenance[handle] = {"kind": "opaque_vault_reference", "ref": "urn:cl:provenance:" + fingerprint}
        claim = {k: copy.deepcopy(source[k]) for k in ("claim", "predicate", "value", "confidence")}
        claim["provenance_handles"] = sorted(set(handles))
        limits = [int(t.split(":")[-1]) for t in transforms if t.startswith(f"truncate:{predicate}:")]
        if limits:
            for field in ("claim", "value"):
                if isinstance(claim[field], str):
                    claim[field] = claim[field].encode("utf-16-le")[:min(limits) * 2].decode("utf-16-le", errors="surrogatepass")
        if "compress:task-facts" in transforms:
            claim["claim"] = " ".join(claim["claim"].split())
        context.append(claim)
    if not context:
        raise ProtocolError("NO_CONTEXT_GRANTED")
    context.sort(key=lambda item: canonical_json(item).encode("utf-16-be"))
    recipient = request["recipient"]["principal"]
    capabilities = sorted(set(decision["granted_actions"]))
    unsigned = {
        "spec_version": VERSION, "type": "scoped_context_bundle", "created_at": stamp(now),
        "issuer": {"id": "urn:cl:bundle-issuer:local"},
        "subject_alias": "urn:cl:alias:" + digest({"subject_ref": request["subject_ref"], "request_ref": request["id"], "recipient": recipient}).split(":")[1],
        "request_ref": request["id"], "request_digest": digest(request),
        "decision_ref": decision["id"], "decision_digest": decision["integrity"]["digest"],
        "policy_snapshot": decision["policy_snapshot"], "recipient": recipient,
        "purpose_code": request["purpose_code"], "task": request["task"],
        "issued_at": stamp(now), "expires_at": stamp(expiry), "single_use": True,
        "context": context, "provenance": provenance,
        "instructions": decision["bundle_instructions"], "capabilities": capabilities,
        "retention": decision["retention"],
        "restrictions": {"onward_disclosure": decision["onward_disclosure"], "memory_write": "proposal_only", "raw_vault_resolution": "forbidden", "retention_seconds": decision["retention"]["max_seconds"]},
        "receipt_contract": {"required": decision["receipt_requirement"]["required"], "required_operations": sorted(set(["bundle.consume", *capabilities]))},
    }
    if "purpose" in request:
        unsigned["purpose"] = request["purpose"]
    bundle = finalize_record(unsigned, "urn:cl:bundle:")
    SchemaValidator().validate(bundle)
    try:
        key = Ed25519PrivateKey.from_private_bytes(bytes.fromhex(synthetic_seed_hex))
    except ValueError:
        raise ProtocolError("INVALID_KEY_MATERIAL") from None
    envelope = {"envelope_version": 1, "bundle": bundle, "authentication": {"algorithm": "Ed25519", "kid": key_id, "sig": b64(key.sign(canonical_json(bundle).encode("utf-8")))}}
    receipts = MemoryReceiptStore()
    if bundle["receipt_contract"]["required"]:
        receipts.check_available()
        receipts.append(_bundle_receipt(bundle, "bundle.issue", clock))
    return envelope


class ProfileConsumer:
    def __init__(self, *, recipient, key_id, public_key_hex, clock, receipts, revocation="clear", legacy_hmac=False, legacy_key=None):
        self.legacy_hmac = legacy_hmac is True
        self.legacy_key = legacy_key
        self.recipient, self.key_id, self.clock = recipient, key_id, clock
        self.receipts, self.revocation = receipts, revocation
        try:
            self.key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_hex))
        except ValueError:
            raise ProtocolError("INVALID_KEY_MATERIAL") from None

    def open(self, serialized):
        if not isinstance(serialized, str) or len(serialized.encode("utf-8")) > MAX_ENVELOPE_BYTES:
            raise ProtocolError("INVALID_AUTHENTICATED_BUNDLE")
        envelope = strict_loads(serialized)
        if not isinstance(envelope, dict) or set(envelope) != {"envelope_version", "bundle", "authentication"} or type(envelope["envelope_version"]) not in (int, float) or envelope["envelope_version"] != 1:
            raise ProtocolError("INVALID_AUTHENTICATED_BUNDLE")
        auth = envelope["authentication"]
        is_ed25519 = isinstance(auth, dict) and set(auth) == {"algorithm", "kid", "sig"} and auth["algorithm"] == "Ed25519"
        is_legacy = isinstance(auth, dict) and set(auth) == {"algorithm", "key_id", "mac"} and auth["algorithm"] == "hmac-sha256"
        if not is_ed25519 and not (is_legacy and self.legacy_hmac and isinstance(self.legacy_key, bytes) and len(self.legacy_key) >= 32):
            raise ProtocolError("INVALID_BUNDLE_AUTHENTICATION")
        identifier = auth["kid" if is_ed25519 else "key_id"]
        encoded_signature = auth["sig" if is_ed25519 else "mac"]
        encoded_length = 86 if is_ed25519 else 43
        if not isinstance(identifier, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/~-]{2,254}", identifier):
            raise ProtocolError("INVALID_BUNDLE_AUTHENTICATION")
        if not isinstance(encoded_signature, str) or not re.fullmatch(r"[A-Za-z0-9_-]{" + str(encoded_length) + r"}", encoded_signature):
            raise ProtocolError("INVALID_BUNDLE_AUTHENTICATION")
        bundle = envelope["bundle"]
        verify_record(bundle, "urn:cl:bundle:")
        scan_forbidden(bundle, "BUNDLE_CONTAINS_FORBIDDEN_MATERIAL")
        SchemaValidator().validate(bundle)
        if auth["kid" if is_ed25519 else "key_id"] != self.key_id:
            raise ProtocolError("UNTRUSTED_BUNDLE_AUTHORITY")
        if is_ed25519:
            try:
                self.key.verify(unb64(auth["sig"], 64), canonical_json(bundle).encode("utf-8"))
            except InvalidSignature:
                raise ProtocolError("BUNDLE_AUTHENTICATION_FAILED") from None
        else:
            expected_mac = hmac.new(self.legacy_key, canonical_json(bundle).encode("utf-8"), hashlib.sha256).digest()
            if not hmac.compare_digest(expected_mac, unb64(auth["mac"], 32)):
                raise ProtocolError("BUNDLE_AUTHENTICATION_FAILED")
        if bundle["recipient"] != self.recipient:
            raise ProtocolError("BUNDLE_RECIPIENT_MISMATCH")
        self.check_current(bundle)
        if self.receipts is None:
            raise ProtocolError("RECEIPT_UNAVAILABLE")
        # Transactional append enforces replay; scanning is an optimization only.
        if any(r["operation"] == "bundle.consume" and r["outcome"] == "success" and (r["actor"], r["bundle_ref"]) == (self.recipient, bundle["id"]) for r in self.receipts.export()):
            raise ProtocolError("BUNDLE_REPLAY")
        self.receipts.check_available()
        try:
            self.receipts.append(_bundle_receipt(bundle, "bundle.consume", self.clock))
        except ProtocolError as error:
            if error.code == "RECEIPT_REPLAY_CONFLICT":
                raise ProtocolError("BUNDLE_REPLAY") from None
            raise
        return ProfileSession(bundle, self)

    def check_current(self, bundle):
        if parse_time(bundle["expires_at"]) <= parse_time(self.clock):
            raise ProtocolError("BUNDLE_EXPIRED")
        if self.revocation == "revoked":
            raise ProtocolError("BUNDLE_REVOKED")
        if self.revocation not in ("clear", None):
            raise ProtocolError("REVOCATION_CHECK_FAILED")


class ProfileSession:
    def __init__(self, bundle, consumer):
        self._bundle, self._consumer = copy.deepcopy(bundle), consumer

    def context(self):
        self._consumer.check_current(self._bundle)
        return copy.deepcopy(self._bundle["context"])

    def propose(self, candidate):
        self._consumer.check_current(self._bundle)
        if "memory.propose" not in self._bundle["capabilities"]:
            raise ProtocolError("ACTION_NOT_AUTHORIZED")
        scan_forbidden(candidate, "MEMORY_PROPOSAL_CONTAINS_FORBIDDEN_MATERIAL")
        if not isinstance(candidate, dict) or set(candidate) != {"operation", "proposed_claims", "provenance_handles", "rationale"}:
            raise ProtocolError("MEMORY_PROPOSAL_CONTAINS_FORBIDDEN_MATERIAL")
        if candidate["operation"] not in ("add", "add_or_contradict", "retract"):
            raise ProtocolError("MEMORY_PROPOSAL_INVALID")
        handles = candidate["provenance_handles"]
        if not isinstance(handles, list) or any(h not in self._bundle["provenance"] for h in handles):
            raise ProtocolError("PROVENANCE_MISSING")
        refs = sorted(set(self._bundle["provenance"][h]["ref"] for h in handles))
        unsigned = {
            "spec_version": VERSION, "type": "memory_update_proposal", "created_at": stamp(parse_time(self._consumer.clock)),
            "issuer": {"id": self._bundle["recipient"]}, "subject_ref": self._bundle["subject_alias"],
            "bundle_ref": self._bundle["id"], "operation": candidate["operation"],
            "proposed_claims": copy.deepcopy(candidate["proposed_claims"]), "provenance_refs": refs,
            "rationale": candidate["rationale"], "submitted_by": self._bundle["recipient"],
            "status": "pending_validation", "approval_requirement": ["source_required", "user_confirm"] if not refs else ["user_confirm"],
            "expires_at": self._bundle["expires_at"],
        }
        proposal = finalize_record(unsigned, "urn:cl:proposal:")
        validate_proposal(proposal)
        self._consumer.receipts.check_available()
        self._consumer.receipts.append(_bundle_receipt(self._bundle, "memory.propose", self._consumer.clock, output=proposal))
        return proposal


def validate_proposal(proposal):
    scan_forbidden(proposal, "MEMORY_PROPOSAL_CONTAINS_FORBIDDEN_MATERIAL")
    verify_record(proposal, "urn:cl:proposal:")
    SchemaValidator().validate(proposal)
    if proposal["status"] != "pending_validation":
        raise ProtocolError("MEMORY_PROPOSAL_CONTAINS_FORBIDDEN_MATERIAL")
    return {"valid": True}


class AnchoredReceiptLog:
    """Version-2 signed local JSONL anchor; replay serialized across processes.

    Detects log-only rollback, not coordinated rollback of both authentic files.
    Does not migrate legacy version-1 anchor files.
    """
    def __init__(self, path, anchor_path=None, seed=None):
        if anchor_path is None or seed is None:
            raise ProtocolError("RECEIPT_ANCHOR_REQUIRED")
        if Path(path).is_symlink() or Path(anchor_path).is_symlink():
            raise ProtocolError("RECEIPT_UNSAFE_PATH")
        self.path, self.anchor_path = Path(path).resolve(), Path(anchor_path).resolve()
        if self.path == self.anchor_path:
            raise ProtocolError("RECEIPT_UNSAFE_PATH")
        self.log_id = digest({"receipt_log_path": str(self.path)})
        try:
            self.key = Ed25519PrivateKey.from_private_bytes(seed)
        except ValueError:
            raise ProtocolError("INVALID_KEY_MATERIAL") from None
        # Compile the immutable schema set once per store, before contending for
        # its lock. Every receipt is still validated on every replay/append.
        self._validator = SchemaValidator()
        with self.lock():
            self._state(initialize=True)

    @contextmanager
    def lock(self):
        lock_path = Path(str(self.path) + ".lock")
        token = uuid.uuid4().hex.encode("ascii")
        deadline = time.monotonic() + 5.0
        while True:
            try:
                fd = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
                with os.fdopen(fd, "wb") as handle:
                    handle.write(token); handle.flush(); os.fsync(handle.fileno())
                break
            except FileExistsError:
                if time.monotonic() >= deadline:
                    raise ProtocolError("RECEIPT_LOCK_TIMEOUT") from None
                time.sleep(0.01)
            except OSError:
                raise ProtocolError("RECEIPT_UNAVAILABLE") from None
        try:
            yield
        finally:
            try:
                if lock_path.read_bytes() == token:
                    lock_path.unlink()
            except OSError:
                pass

    def _read(self, path):
        try:
            if path.is_symlink():
                raise ProtocolError("RECEIPT_UNSAFE_PATH")
            return path.read_bytes() if path.exists() else b""
        except OSError:
            raise ProtocolError("RECEIPT_UNAVAILABLE") from None

    def _write_append(self, path, data):
        try:
            flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            fd = os.open(path, flags, 0o600)
            with os.fdopen(fd, "ab") as handle:
                handle.write(data); handle.flush(); os.fsync(handle.fileno())
            if hasattr(os, "O_DIRECTORY"):
                directory = os.open(path.parent, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(directory)
                finally:
                    os.close(directory)
        except OSError:
            raise ProtocolError("RECEIPT_UNAVAILABLE") from None

    def _parse_log(self, raw):
        if raw and not raw.endswith(b"\n"):
            raise ProtocolError("RECEIPT_LOG_INTEGRITY")
        previous = GENESIS_DIGEST
        entries = []
        try:
            lines = [line.decode("utf-8") for line in raw.split(b"\n")[:-1]]
        except UnicodeError:
            raise ProtocolError("RECEIPT_LOG_INTEGRITY") from None
        for sequence, line in enumerate(lines, 1):
            entry = strict_loads(line)
            if not isinstance(entry, dict) or entry.get("log_version") != 1 or entry.get("sequence") != sequence or entry.get("previous_entry_digest") != previous:
                raise ProtocolError("RECEIPT_LOG_INTEGRITY")
            body = {k: v for k, v in entry.items() if k != "entry_digest"}
            if digest(body) != entry.get("entry_digest"):
                raise ProtocolError("RECEIPT_LOG_INTEGRITY")
            verify_record(entry["receipt"], "urn:cl:receipt:")
            self._validator.validate(entry["receipt"])
            entries.append(entry)
            previous = entry["entry_digest"]
        return entries, previous

    def _anchor(self, *, sequence, entries, tail, raw, previous_sig):
        unsigned = {"anchor_version": 2, "log_id": self.log_id, "anchor_sequence": sequence, "entries": entries, "tail_digest": tail, "byte_length": len(raw), "file_digest": hash_bytes(raw), "previous_sig": previous_sig}
        return {**unsigned, "sig": "ed25519:" + b64(self.key.sign(canonical_json(unsigned).encode("utf-8")))}

    def _state(self, initialize=False):
        raw = self._read(self.path)
        log, tail = self._parse_log(raw)
        anchor_exists = self.anchor_path.exists()
        anchor_raw = self._read(self.anchor_path)
        if not anchor_exists:
            if raw:
                raise ProtocolError("RECEIPT_ANCHOR_MISSING")
            if not initialize:
                raise ProtocolError("RECEIPT_ANCHOR_MISSING")
            genesis = self._anchor(sequence=0, entries=0, tail=GENESIS_DIGEST, raw=b"", previous_sig=GENESIS_SIGNATURE)
            self._write_append(self.anchor_path, (canonical_json(genesis) + "\n").encode("utf-8"))
            anchor_raw = self._read(self.anchor_path)
        if not anchor_raw or not anchor_raw.endswith(b"\n"):
            raise ProtocolError("RECEIPT_ANCHOR_INVALID")
        anchors = []
        expected_previous = GENESIS_SIGNATURE
        try:
            lines = [line.decode("utf-8") for line in anchor_raw.split(b"\n")[:-1]]
        except UnicodeError:
            raise ProtocolError("RECEIPT_ANCHOR_INVALID") from None
        if not lines:
            raise ProtocolError("RECEIPT_ANCHOR_INVALID")
        for index, line in enumerate(lines):
            try:
                anchor = strict_loads(line)
            except ProtocolError:
                raise ProtocolError("RECEIPT_ANCHOR_INVALID") from None
            fields = {"anchor_version", "log_id", "anchor_sequence", "entries", "tail_digest", "byte_length", "file_digest", "previous_sig", "sig"}
            if not isinstance(anchor, dict) or set(anchor) != fields or anchor["anchor_version"] != 2 or anchor["log_id"] != self.log_id or anchor["anchor_sequence"] != index or anchor["entries"] != index or anchor["previous_sig"] != expected_previous:
                raise ProtocolError("RECEIPT_ANCHOR_INVALID")
            unsigned = {k: v for k, v in anchor.items() if k != "sig"}
            try:
                if not isinstance(anchor["sig"], str) or not anchor["sig"].startswith("ed25519:"):
                    raise ValueError()
                self.key.public_key().verify(unb64(anchor["sig"][8:], 64), canonical_json(unsigned).encode("utf-8"))
            except (InvalidSignature, ValueError, ProtocolError):
                raise ProtocolError("RECEIPT_ANCHOR_INVALID") from None
            if index == 0 and (anchor["byte_length"] != 0 or anchor["tail_digest"] != GENESIS_DIGEST or anchor["file_digest"] != hash_bytes(b"")):
                raise ProtocolError("RECEIPT_ANCHOR_INVALID")
            expected_previous = anchor["sig"]
            anchors.append(anchor)
        latest = anchors[-1]
        if len(log) < latest["entries"]:
            raise ProtocolError("RECEIPT_LOG_ROLLBACK")
        if len(log) > latest["entries"]:
            raise ProtocolError("RECEIPT_LOG_UNANCHORED_SUFFIX")
        if latest["byte_length"] != len(raw) or latest["file_digest"] != hash_bytes(raw) or latest["tail_digest"] != tail:
            raise ProtocolError("RECEIPT_LOG_REWRITE")
        return raw, log, anchors

    def check_available(self):
        with self.lock():
            self._state()

    def export(self):
        with self.lock():
            _, log, _ = self._state()
            return [copy.deepcopy(entry["receipt"]) for entry in log]

    def append(self, receipt):
        verify_record(receipt, "urn:cl:receipt:")
        self._validator.validate(receipt)
        with self.lock():
            raw, entries, anchors = self._state()
            if receipt["operation"] == "bundle.consume" and receipt["outcome"] == "success":
                if any(e["receipt"]["operation"] == "bundle.consume" and e["receipt"]["outcome"] == "success" and (e["receipt"]["actor"], e["receipt"]["bundle_ref"]) == (receipt["actor"], receipt["bundle_ref"]) for e in entries):
                    raise ProtocolError("RECEIPT_REPLAY_CONFLICT")
            if receipt.get("supersedes_ref") and not any(e["receipt"]["id"] == receipt["supersedes_ref"] for e in entries):
                raise ProtocolError("RECEIPT_SUPERSEDES_UNKNOWN")
            entry = {"log_version": 1, "sequence": len(entries) + 1, "previous_entry_digest": entries[-1]["entry_digest"] if entries else GENESIS_DIGEST, "receipt": copy.deepcopy(receipt)}
            entry["entry_digest"] = digest(entry)
            line = (canonical_json(entry) + "\n").encode("utf-8")
            self._write_append(self.path, line)
            new_raw = self._read(self.path)
            if new_raw != raw + line:
                raise ProtocolError("RECEIPT_LOG_REWRITE")
            anchor = self._anchor(sequence=len(anchors), entries=len(entries) + 1, tail=entry["entry_digest"], raw=new_raw, previous_sig=anchors[-1]["sig"])
            self._write_append(self.anchor_path, (canonical_json(anchor) + "\n").encode("utf-8"))
            self._state()
            return copy.deepcopy(receipt)
