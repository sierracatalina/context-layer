export {
  canonicalStringify,
  cloneJson,
  containsForbiddenRawMaterial,
  deepFreeze,
  digestJson,
  digestText,
  finalizeCanonicalRecord,
  verifyCanonicalRecord,
} from "./canonical.mjs";
export { LocalCoreError } from "./errors.mjs";
export {
  BUNDLE_AUTHENTICATION_ALGORITHM,
  LEGACY_BUNDLE_AUTHENTICATION_ALGORITHM,
  createEd25519BundleAuthority,
  createLegacyHmacBundleVerifier,
} from "./authority.mjs";
export { jcsBytes, jcsStringify } from "./jcs.mjs";
export {
  openLocalVault,
  VAULT_CIPHER,
  VAULT_ENVELOPE_VERSION,
} from "./vault.mjs";
export {
  evaluatePolicy,
  isValidPurposeCode,
  LOCAL_CORE_SPEC_VERSION,
  POLICY_STATES,
  verifyPolicyDecision,
} from "./policy.mjs";
export {
  issueScopedBundle,
  LOCAL_BUNDLE_ID_PREFIX,
  serializeScopedBundle,
  validateAuthenticatedBundleEnvelope,
  validateScopedBundle,
} from "./bundle.mjs";
export {
  createOperationReceipt,
  openReceiptLog,
  RECEIPT_LOG_GENESIS_DIGEST,
  RECEIPT_LOG_VERSION,
  validateReceipt,
  verifyReceiptLog,
} from "./receipt-log.mjs";
export {
  openReceiptAnchor,
  RECEIPT_ANCHOR_DEFAULT_LOCK_RETRY_MS,
  RECEIPT_ANCHOR_DEFAULT_LOCK_TIMEOUT_MS,
  RECEIPT_ANCHOR_VERSION,
} from "./receipt-anchor.mjs";
export {
  createUtf8FilesAdapter,
  DEFAULT_FILE_CAPTURE_MAX_BYTES,
} from "./files-adapter.mjs";
export {
  createLocalAgentConsumer,
  MAX_SERIALIZED_BUNDLE_BYTES,
  validateMemoryUpdateProposal,
} from "./consumer.mjs";
