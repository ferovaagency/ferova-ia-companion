# Lee con Koa

## Product and visual system

Rebrand of the existing application, using the supplied Stitch exports. Celestial Twilight is the shared palette: midnight background, layered indigo cards, lavender primary actions, amber and mint accents. Plus Jakarta Sans for UI, Literata for quotations. Original Koa red-panda poses are optimized in public/koa; do not replace them with emoji or unrelated mascots.

Tokens live in src/styles.css. Reuse components/koa/UI.tsx and the koa-card, koa-field, koa-button, koa-secondary classes. AppShell owns desktop and mobile navigation. Preserve keyboard focus, semantic labels, reduced motion and empty/error/loading states. Keep the existing TanStack Start/Router, React, Tailwind and Supabase architecture; do not paste complete standalone Stitch HTML documents into routes.

## Routes

| Route | Purpose |
| --- | --- |
| / | Public introduction and signup |
| /discover | Current context and three reading options |
| /onboarding | Reading pace and interests; can be revisited or skipped |
| /library | Books, status/mood filters, grid/list, scanner and wishlist |
| /books/$bookId | Book detail and reading actions |
| /read | Reading timer, progress, optional breathing and soundscape, Koa |
| /notebook | Notes and quotes, favorites, photo transcription, dictation and export |

The app accompanies a reader's own physical or digital book; it does not distribute ebook content. Koa helps choose a book for the current context. Do not promise anxiety treatment or infer emotional states. No invented app-store ratings, reader counts or reading speeds.

## Data and rules

Existing books, reading_sessions, completed_readings and reading RPCs remain authoritative. Streaks count actual page/percentage advancement OR finishing an active READING book directly. Timer activity, opening the app, notes, and imported already-read books do not count. One local calendar date counts once. Preserve rereading cycles.

The additive migration 20261115002935_koa_reading_companion adds private preferences, notes, wishes, conversations, timer receipts and hourly AI usage. Owner RLS and cross-book ownership checks protect data. close_reader_session atomically records advancement/completion and an idempotency receipt, rejecting stale progress. Never directly bypass reading RPCs. The migration was applied to the connected project and recorded in supabase_migrations.schema_migrations.

Wishlisted recommendations are independent from owned books. Moving one into the library deduplicates title/author. AI chat and photo transcription require authentication, book ownership and an hourly request allowance. Photo transcription produces an editable draft; only saving writes the note. Preserve LOVABLE_API_KEY exclusively on the server. Generated Supabase files remain untouched; koa-data.ts extends the client types.

## Verification

Build and TypeScript checks: npm run build; npx tsc --noEmit.
Timer checks (Node 22.18+): node tests/reader-timer.mjs.
Database checks run baseline migrations and the new migration in isolated PGlite, without production user data. Install @electric-sql/pglite@0.3.14 in a temporary test directory and run:

    PGLITE_MODULE=/absolute/test-directory/node_modules/@electric-sql/pglite/dist/index.js node tests/reader-database.mjs

13 database checks cover ownership isolation, forged owner rejection, deduplication, progress-only streaks, direct completion, unknown page counts, retry idempotency, stale progress and quota. Eight timer checks cover pause/resume, reload recovery and invalid drafts.

Browser automation could not launch Chromium in the execution environment (socket permission restriction). Visual fidelity, real device camera/ISBN, microphone, audio, and live AI responses still require browser/device acceptance testing. The scanner implementation predates this rebrand; its visible entry point is retained. Do not represent the earlier barcode bug as hardware-tested by this change.

Native widgets, app-store releases and new external audio assets are outside this implementation. Soundscapes use browser-generated audio after an explicit action. Print/PDF uses browser printing of loaded notes; more notes can be loaded before export. Voice features depend on browser support.
