// Reference bridge. Deliberately outside the exportable conformance kit.
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPublicKey, verify } from "node:crypto";
import {
  canonicalStringify, digestJson, finalizeCanonicalRecord, isValidPurposeCode,
  evaluatePolicy, createEd25519BundleAuthority, issueScopedBundle,
  createLocalAgentConsumer, createLegacyHmacBundleVerifier, createOperationReceipt, openReceiptLog,
  validateMemoryUpdateProposal,
} from "../packages/local-core/index.mjs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { jcsBytes } from "../packages/local-core/jcs.mjs";

function store() {
  const records = [];
  return { preflight: async () => ({ ok: true }), receipts: async () => structuredClone(records), append: async (receipt) => { records.push(structuredClone(receipt)); return { sequence: records.length }; } };
}
async function consumer(input, receipts) {
  const publicKey = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(input.public_key_hex, "hex")]), type: "spki", format: "der" });
  return createLocalAgentConsumer({
    principal: input.recipient, receiptLog: receipts, trustedKeyId: input.key_id,
    legacyHmac: input.legacy_hmac === true,
    bundleVerifier: input.legacy_hmac === true ? await createLegacyHmacBundleVerifier({ keyId: input.key_id, keyProvider: async () => Buffer.from(input.synthetic_legacy_key_hex, "hex") }) : { algorithm: "Ed25519", kid: input.key_id, verify: async (bundle, authentication) => authentication.kid === input.key_id && verify(null, jcsBytes(bundle), publicKey, Buffer.from(authentication.sig, "base64url")) },
    revocationProvider: async () => { if (input.revocation === "error") throw new Error("Synthetic revocation outage"); return input.revocation === "revoked"; },
    clock: () => new Date(input.clock),
  });
}
async function errorCode(work) {
  try { await work(); return null; } catch (error) { return error.code ?? error.name; }
}
async function run(input) {
  if (input.adapter_version !== "context-layer-conformance-adapter/1") throw Object.assign(new Error("Unknown adapter version"), { code: "UNSUPPORTED_ADAPTER_VERSION" });
  const clock = () => new Date(input.clock);
  switch (input.operation) {
    case "validate_schema": {
      if (!["context-request", "policy-decision", "scoped-context-bundle", "receipt", "memory-update-proposal"].includes(input.schema_name)) throw new Error("Unsupported schema");
      const ajv = new Ajv2020({ strict: true }); addFormats(ajv);
      const schema = JSON.parse(readFileSync(new URL("../protocol/schemas/0.2.0-draft.1/" + input.schema_name + ".schema.json", import.meta.url), "utf8"));
      return { valid: ajv.compile(schema)(input.value) };
    }
    case "canonicalize": return { canonical_json: canonicalStringify(input.value), digest: digestJson(input.value) };
    case "finalize_record": return finalizeCanonicalRecord(input.unsigned, input.id_prefix);
    case "purpose_code": return { valid: isValidPurposeCode(input.value) };
    case "evaluate_policy": return evaluatePolicy({
      request: input.request, policy: input.policy, approval: input.approval ?? null, clock,
      receiptStore: input.receipt_preflight === "available" ? store() : null,
      approvalVerifier: input.approval_verifier === "absent" ? null : async ({ approval, request_digest, policy_digest }) => input.approval_verifier === "authenticated" && approval.id === input.approval?.id && request_digest === digestJson(input.request) && policy_digest === digestJson(input.policy),
    });
    case "issue_bundle": {
      const receiptStore = store();
      const authority = await createEd25519BundleAuthority({ keyId: input.key_id, keyProvider: async () => Buffer.from(input.synthetic_seed_hex, "hex") });
      try {
        const decision = await evaluatePolicy({ request: input.request, policy: input.policy, clock, receiptStore });
        return await issueScopedBundle({ request: input.request, decision, claims: input.claims, clock, receiptStore, bundleAuthority: authority });
      } finally { authority.close(); }
    }
    case "verify_envelope": {
      const agent = await consumer(input, store()); await agent.openBundle(JSON.stringify(input.envelope));
      return { accepted: true };
    }
    case "replay": {
      const receipts = store(); const agent = await consumer(input, receipts);
      await agent.openBundle(JSON.stringify(input.envelope));
      const second_error = await errorCode(() => agent.openBundle(JSON.stringify(input.envelope)));
      const restarted = await consumer(input, receipts);
      return { first_accepted: true, second_error, restart_error: await errorCode(() => restarted.openBundle(JSON.stringify(input.envelope))) };
    }
    case "memory_proposal": {
      const agent = await consumer(input, store()); const session = await agent.openBundle(JSON.stringify(input.envelope));
      return session.proposeMemoryUpdate({ operation: input.proposal.operation, proposedClaims: input.proposal.proposed_claims, provenanceHandles: input.proposal.provenance_handles, rationale: input.proposal.rationale });
    }
    case "validate_proposal": return { valid: validateMemoryUpdateProposal(input.proposal) };
    case "receipt_log": {
      const directory = await mkdtemp(join(tmpdir(), "context-layer-kit-"));
      const filePath = join(directory, "receipts.jsonl");
      const anchor = { filePath: join(directory, "anchor.jsonl"), key: Buffer.from(input.synthetic_seed_hex, "hex") };
      try {
        const missing_anchor_error = await errorCode(() => openReceiptLog({ filePath: join(directory, "unanchored.jsonl") }));
        const log = await openReceiptLog({ filePath, anchor });
        try {
          for (const operation of input.operations) await log.append(createOperationReceipt({ operation, actor: "urn:agent:synthetic-receipt-vector", subjectRef: "urn:cl:alias:synthetic-receipt-vector", outcome: "success", userSummary: "Synthetic test-only receipt vector.", clock }));
        } finally { await log.close(); }
        const log_jsonl = await readFile(filePath, "utf8"); const anchor_jsonl = await readFile(anchor.filePath, "utf8");
        await writeFile(filePath, log_jsonl.split("\n")[0] + "\n");
        const rollback_error = await errorCode(() => openReceiptLog({ filePath, anchor }));
        return { log_path: filePath, log_jsonl, anchor_jsonl, missing_anchor_error, rollback_error };
      } finally { await rm(directory, { recursive: true, force: true }); }
    }
    default: throw Object.assign(new Error("Unknown operation"), { code: "UNSUPPORTED_OPERATION" });
  }
}
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  process.stdout.write(JSON.stringify({ ok: true, result: await run(input) }) + "\n");
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: { code: error.code ?? "ADAPTER_ERROR", message: error.message } }) + "\n");
}
