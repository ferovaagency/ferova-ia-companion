# Architecture rules

- Preserve the existing Google callback and bearer middleware; authentication hydration must finish on the public callback before protected navigation.
- Keep bingo definitions in owner-scoped tables and complete book cells through a database RPC that verifies authoritative completed readings; experience completion never writes reading history.
- Freeze activated bingo definitions and allow draft editing/deletion only, so existing completion evidence cannot be silently reinterpreted.
- Keep incremental expansion acceptance and remaining work in docs/expansion-checklist.md; do not treat partial delivery as full acceptance.
- Select calendar books only from verified catalog records, install atomically with shelf exclusions, and reveal through the owner/date-checking RPC so opened discoveries remain immutable.
- Load recommendation shelves and emotional signals through the authenticated server client; caller-provided book data is not authoritative.
- Keep social profiles separate from private account profiles; share only explicit title/author/star/list/bingo projections through viewer-authorized RPCs, never widen private book or notebook policies.
- Keep club memberships and invitations RPC-only with owner verification; use security-definer access helpers to avoid recursive policies.
- Store profile media in a private bucket and download through viewer RLS, never permanent public URLs; re-encode validated uploads to strip metadata.
- Join shared bingos by making immutable individual copies; derive joint progress and streak contributions from existing owned reading history without writing duplicate events.