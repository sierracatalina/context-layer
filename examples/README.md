# Local-core synthetic demonstration

Run the complete local-only pipeline with:

```sh
node examples/local-core-demo.mjs
```

The demonstration creates temporary synthetic input and keys, captures the input into an encrypted vault, evaluates every policy state plus an authenticated approval, issues and verifies an authenticated scoped bundle, writes an anchored receipt chain, executes one local-agent capability, and creates a pending memory proposal. It removes the temporary workspace before exiting.

Standard output is one minimized JSON summary. It intentionally excludes captured plaintext, filesystem paths, vault references, keys, bundle authentication material, and receipt payloads.
