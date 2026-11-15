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
- Image OCR review/source credit; oracle per-cell options. Shared discovery/copy implemented in cycle 3; live signed-in acceptance remains pending.
- Named friend/club viewer preview (anonymous public preview implemented); edition-specific chapter boundaries and disjoint rejoin participation intervals.
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
- Unverified: signed-in editor workflow, whole-route visual/keyboard/offline audit, Google OAuth end-to-end, device media, clubs/member permissions and reward ledger. See cycle 2 below for calendar acceptance limits.

## Cycle 2 — calendars, lists and emotional signals
- [x] Connected Advent and monthly calendars to Aventuras, lists to navigation, and ratings to each book detail page.
- [x] Advent prepares 24 distinct verified catalog discoveries for the dynamically derived next year; all shelf statuses and wishes excluded; normalized ISBN/title-author deduplication enforced in selection and atomic installation.
- [x] Server and database enforce December 1–24 opening according to reader timezone, catch-up through December 31; November is preparation only.
- [x] Opened windows persist and cannot be regenerated. Before revealing an unopened window, recheck shelf and wishes; replace a duplicate using verified candidates.
- [x] Save creates both a wish and the annual named list membership idempotently. Monthly suggestions use the current-year list.
- [x] Twelve separate monthly chapters, stored preferences/context and replaceable suggestions.
- [x] Custom list create/edit/delete, multiple lists per book, add/remove and authoritative reordering.
- [x] Existing stars/reviews preserved; optional tears, immersion, tags, tiers/rank and per-page/chapter notebook feelings; no reading activity from these writes.
- [x] Recommendation server now loads the actual owner shelf, ratings, preferences and emotional signals; ignores caller-provided shelf. Similar/different selector and quota enforced.
- [x] Fixed the pending window-opening serialization build error by returning a validated plain catalog object.
- [x] Verified live schema contains all five calendar/list/feeling tables and four supporting RPCs; reused already-applied migrations 0004/0005, no duplicate production migration.
- [x] `tests/discoveries-database.mjs`: **30 passing assertions**, isolated real authenticated/anonymous roles. Includes all-status and wish exclusions, normalized ISBN/title deduplication, batch rollback, 24/12 persistence, immutable opened windows, next-year list, repeat save, list CRUD/order/multiple membership, outsider denial, ratings preservation and no additional reading events.
- [x] Date RPC tests replace only the clock in isolated migration SQL, exercising actual timezone gate and duplicate replacement; production functions are unchanged.
- [x] `tests/discoveries-rules.test.ts`: **5 passed** for normalized identities, ISBN editions, timezone boundary, catch-up and intensity limits.
- [x] Existing bingo/reader/timer tests remain **40/40 passing**; total **75 passing assertions/tests**.
- [x] Automatic build/typecheck **build OK**, latest observed 2026-11-15 16:35:09 UTC.
- [x] Public Chromium desktop/mobile smoke check: home/FAQ rendered, mobile FAQ no horizontal overflow, no runtime errors; signed-out lists/adventures redirect to auth. Mobile screenshot inspected.
- [ ] Signed-in end-to-end calendar/list/rating acceptance: no requesting-user session available; no unrelated user's session minted or used. Existing earlier self-mint attempt found no matching requesting-user account.
- [ ] Live AI/catalog selection, sufficient-candidate behavior and actual cover rendering not exercised through a signed-in flow. Catalog failure paths preserve opened entries and report insufficient verified candidates; do not equate isolated database fixtures with real catalog verification.
- [ ] Full signed-in desktop/mobile dialog, keyboard and reload audit remains pending.
- Production was not published. GitHub synchronization is managed externally and was not independently verified.

## Next cycle priorities
1. Finish signed-in Aventuras acceptance, then add copy/shared participation, per-cell three-option oracle and reviewed OCR with credit.
2. Complete signed-in calendar preparation/reveal/save, monthly replacement, list CRUD/reload and rating acceptance with the requesting user's authorized session.
3. Complete social signed-in acceptance and refinements, then shelf/rewards; keep OCR and protected public-demo work explicit.

## Cycle 3 — social privacy, clubs and individual shared adventures
Starting branch supplied by user: main `61a2c26`; no checkout, manual commit, push or production publish performed. GitHub synchronization remains platform-managed and independently unverified.

### Implemented
- [x] Separate social profile with unique lowercase @handle, name and editable bio; private by default. Existing account profiles and private books/notebook policies unchanged.
- [x] Private avatar/cover bucket, 5 MB cap, MIME/extension/path checks in storage policies; browser decodes and re-encodes JPG/PNG/WebP, strips metadata and bounds image dimensions. Private media downloads use viewer RLS and revocable object URLs, not public or long-lived signed URLs.
- [x] Independent private/friends/specific-club/public visibility for profile and each explicitly shared book, stars, list or active bingo. Explicit consent UI identifies the projection; lists disclose their current and future title membership. No notes, emotion journal, full book metadata, emails or auth fields in projections.
- [x] Public URL `/u/$handle`, anonymous viewer preview and `/community` for explicitly public profiles/adventures. Public profile metadata remains generic/noindex rather than exposing private profile details.
- [x] Friend request/accept/reject/cancel/remove, block/unblock and report. Reports are persisted and available to verified admins for review/status actions.
- [x] Private club create, owner-only invitations/removal, recipient-only invitation acceptance/decline, member leave; role writes RPC-only. Security-definer membership helpers avoid recursive policies.
- [x] Shared bingo discovery for public/friend/club audience; joining makes one immutable individual active copy with separate owned progress. Existing real-completion RPC and private active board rules reused unchanged.
- [x] Joint reading created from owner's actual book, optional goal and chapter count; participants select a matching owned edition. Edition-independent percentage derives from actual stored page progress. Comments read/write gated on a proportional chapter threshold and membership; own comment delete available.
- [x] Group streak and contributions derive only from qualifying reading sessions/direct-finish streak evidence, with deduplicated reader/day aggregation; no reading event or reward created by social actions. Leaving closes participation and retains past qualifying days so others' streak is not erased.
- [x] Five-nav Discover/Library/Read/Adventures/My refuge; notebook, lists and settings stay reachable. Settings privacy copy updated, mobile header allowed to wrap instead of overflow.
- [x] Applied additive migrations 0006–0010 once, generated types refreshed by each migration. Live query confirmed all 11 social tables; bucket verified private with 5 MB limit. Corrected joint-author and storage-policy name binding regressions.

### Exact verification
- `tests/social-database.mjs`: **26 passing assertions**, using isolated authenticated owner/member/friend/outsider plus anonymous roles; fixture setup privileged, behavior assertions not superuser. Covers private default, handle uniqueness, forged ownership, no implicit shelf/notebook publishing, sender acceptance misuse, friend visibility, direct role-write denial, owner/member club roles, wrong-recipient invite misuse, club visibility, exact star projection, privacy revocation, forged sharing, immutable individual copy/retry, foreign/incomplete book rejection, experience without reading, correct joint identity, edition percent, spoiler access, qualifying streak/day dedup, block access, leave revocation/retained streak, media path/MIME/size/revocation and ordinary report visibility/status denial.
- Existing tests rerun: bingo **19**, discoveries DB **30**, reader DB **13**, timer **8**, discovery rules **5**; previous **75** retained. Total **101** checks.
- Automatic build/typecheck: **build OK** observed 2026-11-15 21:11:36 UTC (later final result recorded in tool logs).
- Chromium: 1280×1800 desktop and 390×844 mobile unavailable-profile/public preview safe state, no horizontal overflow; signed-out refuge/club/adventures redirected to auth; FAQ remained available. No page runtime errors. Screenshots inspected. Public community empty state checked separately.
- Requesting-user session: `lovable auth-session --json --self` returned no matching requesting-user account. No unrelated user's session minted or used. Therefore live signed-in persistence, uploads, friend/member workflows, five-nav layout and dialogs are **not** claimed end-to-end verified; isolated database tests are not a substitute.

### Remaining / known limits
- [ ] Named friend/club viewer impersonation preview; only true anonymous preview currently offered.
- [ ] Edition-specific chapter page boundaries: current spoiler gate uses proportional percentage/chapter count, not exact chapter ends. Do not describe this as exact chapter recognition.
- [ ] Disjoint participation intervals after leave/rejoin: current single joined/left interval retains history but rejoining clears the end. Fine-grained gap exclusion still needs interval history before claiming full rejoin semantics.
- [ ] Signed-in responsive/keyboard/focus/offline/reload acceptance and live admin report moderation.
- [ ] OCR/source credit, per-cell oracle, cozy shelf/crop/decor ledger and durable-abuse-protected public oracle demo remain unimplemented. Whole approved expansion is **not** complete.
- No production publishing; no Google/camera/microphone end-to-end claim.