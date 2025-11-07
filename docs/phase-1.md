# Phase 1 Notes

## Data Schemas

- **Collections:** Stored across `collections`, `folders`, and `requests` stores. Each document carries a `meta` object (`id`, `createdAt`, `updatedAt`, `version: 1`) plus an `order` field for deterministic exports.
- **Environments:** Standalone docs with `meta`, `name`, optional `description`, `vars`, and `order`.
- **Secrets:** Persisted as `{ meta, name, environmentId?, envelope }` where `envelope` follows `{ v: 1, alg: 'AES-GCM', salt, iv, ct }` (base64url encoded fields).

JSON exports serialise objects with sorted keys and arrays ordered by `order` (falling back to `meta.id`).

## Variable Resolution

Request previews resolve placeholders using this precedence:
1. Request-scoped variables (`requestVariables` when loading from a collection)
2. Active environment variables
3. Global defaults (not populated yet, reserved for future presets)

Unresolved tokens are flagged as warnings in the chip preview within the request builder.

## Secrets Lock/Unlock

- `SecretCryptoService` derives a PBKDF2 key (200k iterations, SHA-256) and keeps the base key in memory only.
- Unlocking derives the session key; locking wipes it and runs on tab close.
- Secret values are stored as encrypted envelopes in IndexedDB. Environment rows swap plaintext values with `{{$secret.<id>}}` references once protected. Unlocking is required before encrypting new secrets or revealing existing ones.

## IndexedDB Migration

- Database bumped to version `4`. Upgrade path creates new stores (`collections`, `folders`, `requests`, `environments`, `secrets`, `meta`) and copies legacy `pastRequests` data into `history`.
- `meta` store seeds `{ schemaVersion: 1, activeEnvironmentId: null }` and provides space for forward migrations. `migrateV1toV2()` is scaffolded for future structural changes.
