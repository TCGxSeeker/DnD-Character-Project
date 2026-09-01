# Schema Migrations and Recovery Work Brief

Status: `complete`
Checklist authority: `docs/ENGINE_COMPLETION.md` → Schema migrations and recovery

## Contract

`src/data/store.js` owns a sequential migration registry. Each migration advances exactly one integer version, preserves unknown library and character fields by default, and normalizes only fields the new schema owns. Versions newer than the app, versions older than the supported floor, duplicate character ids, and malformed required records are rejected before state replacement.

## Supported versions

- Version 1: original local library format; migrated to version 2 with explicit effect/history collections and ruleset settings.
- Version 2: single freeform session-notes field; migrated to version 3 by preserving that prose as the first immutable session archive entry.
- Version 3: current format with dated `sessionEntries` and a separate persisted session draft.

Fixtures live in `tests/fixtures/schema-v1.json`, `tests/fixtures/schema-v2.json`, and `tests/fixtures/schema-v3.json`.

## Recovery protocol

Before replacing the primary local record, save writes the prior primary record to a recovery key and the validated next state to a pending transaction key. It then writes the primary record and clears pending. On startup, a missing or malformed primary may recover the validated pending transaction, then the recovery copy. A malformed import remains a pure validation failure and cannot replace the current in-memory library.

## Verification

Store tests cover migration sequencing, every supported-version fixture, unknown-field preservation, malformed import safety, backup/restore, pending transaction recovery, and normal two-phase commits.
