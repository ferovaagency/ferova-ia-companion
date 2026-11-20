# Validation and database rollout

Use Node 22.18+ (native TypeScript support for the timer tests), or Node 24.

```sh
npm ci
npm test
npm run typecheck
npm run build
```

`npm test` runs the rule tests and isolated PostgreSQL-compatible database tests.
It does not require database credentials and never writes to a hosted project.
The reward regression suite imports the cumulative audit fixture, which applies
migrations in order and exercises permissions as real non-admin database roles.
Earlier standalone social/creative suites remain useful for historical regression
checks but repeat assertions already exercised by the cumulative audit fixture.

## Hosted migration still required

Apply `drizzle/migrations/0015_immutable_reward_evidence.sql` once, after 0014,
through an authorized database migration connection. This is additive: it keeps
existing decorations and captures the original reward identity of existing
reading evidence. Do not run old migrations again. Verify afterward that
`reader_reward_evidence` exists and `reader_claim_rewards()` contains the
immutable-evidence insertion. The direct repository session had no permission
to inspect/apply this migration to the hosted Supabase project.

The app remains compatible while this migration is pending, but the date-edit
reward fix is not effective on the hosted database until it is applied.

## Acceptance still requiring browser/device access

Test Google sign-in return; create/edit/reload profile, bingo, calendar and lists;
upload/crop images; reveal and save real catalog suggestions; share with a friend
and club then revoke access; switch accounts and verify no stale private data;
record progress/direct finish and verify streak/reward; leave/rejoin group reading;
keyboard focus/dialogs and offline recovery at 320/390/desktop widths; camera ISBN
on a physical device. Automated database tests do not substitute for these flows.

## Planes Gratis / Pro con Whop (migración 0016)

Apply `drizzle/migrations/0016_reader_plans_whop.sql` once, after 0015. It is
additive: it adds Whop columns to `memberships`, monthly usage counters and the
free-plan caps (50 books, 3 own lists, 1 bingo, Advent windows 1-3, creating clubs
and joint readings). Readers who already exceed a cap keep everything; only new
inserts are limited. Until it is applied, the app keeps working without limits
(`claimFeature` skips the missing RPC).

Server secrets (Lovable project settings, never in the client or the repo):

- `WHOP_API_KEY` — company API key (scopes: checkout_configuration:create, member:basic:read).
- `WHOP_WEBHOOK_SECRET` — secret of the webhook pointing to `https://librero-ia.ferova.com.co/api/whop/webhook`, subscribed to `membership.updated` (and `membership.activated`).
- `WHOP_ACCOUNT_ID` — the `biz_…` id.
- `WHOP_PLAN_MONTHLY`, `WHOP_PLAN_YEARLY` — the `plan_…` ids (7 USD/month, 70 USD/year).

Acceptance: buy with a Whop test/sandbox flow, confirm `memberships.is_paid` and
`payment_source='whop'`, see «Tu plan» in Ajustes switch to Pro, cancel from the
manage link and confirm access stays until `current_period_end` and then drops.
Courtesy, manual and admin access are never downgraded by a Whop cancellation.

## Retos del Adviento (migración 0017)

Apply `drizzle/migrations/0017_advent_challenges.sql` after 0016. Windows
2,4,7,9,11,14,16,18,21,23 are challenges; the other 14 keep a catalog book.
Reading challenges are verified against today's real `reading_sessions`
(pages or minutes) and note challenges against a note saved today; completing
one never writes reading history or streak days. Calendars prepared before
this change may hold books in challenge slots: they are ignored, not deleted.
