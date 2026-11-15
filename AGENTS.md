# Architecture rules

- Preserve the existing Google callback and bearer middleware; authentication hydration must finish on the public callback before protected navigation.
- Keep bingo definitions in owner-scoped tables and complete book cells through a database RPC that verifies authoritative completed readings; experience completion never writes reading history.
- Freeze activated bingo definitions and allow draft editing/deletion only, so existing completion evidence cannot be silently reinterpreted.
- Keep incremental expansion acceptance and remaining work in docs/expansion-checklist.md; do not treat partial delivery as full acceptance.
- Select calendar books only from verified catalog records, install atomically with shelf exclusions, and reveal through the owner/date-checking RPC so opened discoveries remain immutable.
- Load recommendation shelves and emotional signals through the authenticated server client; caller-provided book data is not authoritative.