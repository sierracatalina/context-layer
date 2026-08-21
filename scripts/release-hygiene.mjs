import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".wrangler",
  "dist",
  "node_modules",
]);

function listCandidateFiles(root, directory = root) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        files.push(...listCandidateFiles(root, path));
      }
    } else if (entry.isFile()) {
      files.push({ absolute: path, display: relative(root, path) });
    }
  }
  return files;
}

const checks = [
  {
    label: "legacy Context Layer version",
    pattern: /context-layer\/0\.1-draft/g,
  },
  {
    label: "legacy valid-until field",
    pattern: /"valid_until"\s*:/g,
  },
  {
    label: "legacy free-text purpose allowlist",
    pattern: /"allowed_purposes"\s*:/g,
  },
  {
    label: "Windows user-profile path",
    pattern: /[A-Za-z]:[\\/]Users[\\/][^\\/\s"'<>]+/g,
  },
  {
    label: "macOS user-profile path",
    pattern: /\/Users\/[^/\s"'<>]+/g,
  },
  {
    label: "Linux user-home path",
    pattern: /\/home\/[^/\s"'<>]+/g,
  },
  {
    label: "OpenAI-style secret",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: "GitHub token",
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/g,
  },
  {
    label: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    label: "private key material",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
];

const findings = [];
for (const path of listCandidateFiles(process.cwd())) {
  const bytes = readFileSync(path.absolute);
  if (bytes.includes(0)) continue;
  const source = bytes.toString("utf8");
  for (const check of checks) {
    check.pattern.lastIndex = 0;
    for (const match of source.matchAll(check.pattern)) {
      const line = source.slice(0, match.index).split("\n").length;
      findings.push(`${path.display}:${line}: ${check.label}`);
    }
  }
}

if (findings.length > 0) {
  process.stderr.write("Release hygiene failed:\n" + findings.join("\n") + "\n");
  process.exit(1);
}

process.stdout.write("Release hygiene passed for candidate text files.\n");
