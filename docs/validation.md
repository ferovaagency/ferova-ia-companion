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
