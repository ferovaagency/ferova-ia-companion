# Approved expansion — incremental delivery

Baseline: local HEAD `04c6e88` (Google callback fix), confirmed before edits. Production publishing is not authorized. No existing reading RPC, supplied Koa image, scanner, import, notebook or chat is replaced.

## Cycle 1 acceptance
- [x] Implemented native 3×3 / 4×4 / 5×5 private bingo draft editor.
- [x] Title, purpose, optional dates, reuse rule, per-cell book conditions or experiences.
- [x] Five original starter templates, editable before activation.
- [x] Owner-only persistence; draft edit/delete, activation, individual cell assignment; database tests passed.
- [x] Completion linked to authoritative completed readings; no experience reading streak; database tests passed.
- [x] Settings, creator, useful help, changelog and public FAQ/feedback implemented.
- [x] Independent nonadmin database isolation tests.
- [ ] Signed-in browser editor save/reload, mobile grids and keyboard/dialog acceptance: session mint found multiple users; `--self` found no account for the requesting user. No other account was selected without authorization. Sign in in the preview to continue this acceptance.

## Not yet implemented (next cycles)
- Shared board discovery, join/copy, club participants; image OCR review/source credit; oracle per-cell options.
- Christmas Advent: 24 distinct catalog-verified books excluded from current books and wishes, persisted reveals, unopened replacement, local December gates/catch-up, next-year list. In November show honest preparation only. No daily finish obligation or streak on reveals.
- Separate twelve monthly reading chapters, preferences and replaceable suggestions.
- Named custom lists, multiple membership, reordering, optional tears/immersion/tags/tiers, per-page/chapter feelings, server-authoritative recommendation signals.
- Unique handles, validated avatar/cover uploads, private-default content-scoped visibility, viewer preview, friends, blocks/reports and clubs.
- Joint edition-independent percent, spoiler-gated discussion, contribution-based group streak with no duplicate events.
- Cozy shelf/list, crop/preview covers, original decor and idempotent reward ledger.
- Public oracle demo with durable abuse protection; existing private AI endpoints must not be opened. Anti-abuse implementation remains pending, not a fake demo.
- Whole-app mobile/desktop keyboard, offline, dialogs and integration regression audit.

## External acceptance / limits
- GitHub sync is managed by Lovable; the agent cannot inspect connection/status or push main. Verify synchronized branch in Project settings → Git. No manual git changes were made.
- Real Google OAuth, physical camera/microphone and complete production checks have not been performed.
- Hosted builds/type checks are automatic; no manual build command is run.

## Test results
- `tests/bingo-database.mjs`: **19/19 passed**, isolated PGlite with actual `authenticated` and `anon` roles, never superuser-only assertions. Covers 3/4/5 dimensions, forged ownership, frozen active boards, experience without streak, cross-reader book rejection, real completion evidence, page conditions, no reuse, retry idempotency, outsider read/write/RPC denial and direct progress write denial.
- `tests/reader-database.mjs`: **13/13 passed**, including private notes, quotas, actual page progress, direct finish, unknown pages, timer retries and stale progress.
- `tests/reader-timer.mjs`: **8/8 passed**. Total: **40 passing assertions**.
- Automatic build/typecheck: latest observed entry **build OK**, 2026-11-15 16:05:12 UTC; prior RPC-nullability errors resolved through a typed client extension, without editing generated files.
- Live schema read verified both new tables after applying `drizzle/migrations/0003_private_reading_bingos.sql`; existing migrations were not reapplied to production.
- Chromium public checks: 1280×1800 desktop and 390×844 mobile FAQ, expanded questions, canonical, home help navigation and no horizontal overflow passed. Signed-out `/adventures` correctly redirects to `/auth`. No browser runtime errors captured. Screenshots inspected.
- Public contact: a clearly marked QA message was submitted through the real form and success appeared. No mocked request or persistence was used. The test message remains identifiable in admin feedback.
- Database linter: one existing locked AI usage table without policies and seven authenticated SECURITY DEFINER warnings. New bingo RPC intentionally callable by authenticated readers, checks `auth.uid()` ownership and book evidence, and denies anonymous callers. No claim of comprehensive security certification.
- Unverified: signed-in editor workflow, whole-route visual/keyboard/offline audit, Google OAuth end-to-end, device media, clubs/member permissions, reward ledger, Advent and monthly chapters (not implemented in this cycle).

## Next cycle priorities
1. Finish signed-in Aventuras acceptance, then add copy/shared participation, per-cell three-option oracle and reviewed OCR with credit.
2. Implement the critical Advent catalog/exclusion/date/persistence flow and next-year list, with isolated tests.
3. Add lists/emotional ratings and server-authoritative oracle context, then profiles/clubs, shelf/rewards and full acceptance.