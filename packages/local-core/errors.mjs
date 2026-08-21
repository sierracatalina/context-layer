export class LocalCoreError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "LocalCoreError";
    this.code = code;
    this.details = details;
  }
}

export function fail(code, message, details) {
  throw new LocalCoreError(code, message, details);
}
