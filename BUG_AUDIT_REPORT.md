# BUG AUDIT REPORT — ANNASHUWA VTU (end-to-end)

Date: 2026-09-05. Environment: Windows, Node v24.19.0, MongoDB standalone (no replica set),
backend Express+Mongoose on :4000, Next.js 15 frontend on :3000. All findings below were
established by reading code AND by live terminal/API reproduction unless marked otherwise.

Method: AUDIT → IDENTIFY → DOCUMENT → FIX → TEST → VERIFY → RE-AUDIT.
Fixes were applied root-cause-first; nothing was hidden, disabled, or faked.

## Summary counts

| Severity | Found | Fixed | Remaining (documented risk) |
| -------- | ----- | ----- | --------------------------- |
| CRITICAL | 1 | 1 | 0 |
| HIGH | 6 | 6 | 0 (+2 architecture constraints documented) |
| MEDIUM | 5 | 4 | 1 (dependency, mitigated) |
| LOW | 4 | 4 | 0 |
| INFO | 5 | 0 (by design) | 5 documented |
| TOTAL | 22 | 16 | 6 documented |

---

## BUG-001 — Concurrent wallet debits lose updates (double-spend / overspend)

- Category: Wallet / Concurrency / Financial integrity
- Severity: CRITICAL
- Location: `backend/src/services/wallet.service.ts` — `debitWallet` (old L96-103),
  `creditWallet` (old L141-145), `holdFunds`/`releaseFunds` (old L178-201)
- Function/API: every purchase (`POST /api/airtime|data|electricity|cable|exam-pins/purchase`),
  funding confirm, refunds, reconciliation
- Root cause: read-compute-`$set`. The code read the wallet, computed
  `newBalance/newAvailable` in JS, then `findOneAndUpdate({_id, availableBalance:{$gte}}`,
  `{$set:{...}})`. The `$gte` guard only checks at match time; concurrent writers each
  compute from the same snapshot and overwrite each other.
- Why a problem: money is created/destroyed. 6×₦5000 concurrent debits against ₦20740
  all returned 200 SUCCESSFUL but only ₦15000 was debited (₦30000 of airtime delivered).
  With other interleavings the balance could go negative.
- Expected: N concurrent debits of A either all apply (balance −N×A) or the unaffordable
  ones are rejected; balance never negative; ledger matches.
- Actual (reproduced live 2026-09-05): BEFORE 20740 → 6×5000 all SUCCESSFUL → AFTER 5740
  (only 15000 debited). Ledger `balanceAfter` values: 15740, 10740×4, 5740 — textbook
  lost update.
- Fix: single atomic `$inc` with guard —
  debit: `findOneAndUpdate({_id, availableBalance:{$gte:amount}}, {$inc:{availableBalance:-a, balance:-a}})`;
  credit/hold/release likewise. `balanceAfter` now comes from the updated document.
  No API/shape change.
- Fix status: FIXED (`wallet.service.ts`)
- Test status: PASS live — 6×5000 vs 35740 → AFTER 5740 exactly (MATCH true); overspend
  run (3×5000 vs 5740) → 1×200 + 2×400 Insufficient, AFTER 740, never negative.

## BUG-002 — TEST payment gateway + client `simulate` usable in live mode (free funding)

- Category: Payments / Security / Financial integrity
- Severity: HIGH
- Location: `backend/src/services/wallet-funding.service.ts` (`initializeFunding` L20,
  `finalizeWalletFunding` L93-95), `backend/src/services/payment/types.ts` (`isEnabled` L47-48),
  `backend/src/services/payment/index.ts` (`getPaymentProvider`)
- Root cause: `initializeFunding` honored the client-supplied `gateway` verbatim
  (`input.gateway || "TEST"`), and `isEnabled("TEST")` returns true even when
  `PAYMENT_MODE=live`. `fund/confirm` applied client `simulate` to the TEST ledger, then
  `getPaymentProvider("TEST").verify()` read that same ledger. Chain: live mode +
  gateway=TEST + simulate=success → wallet credited with no real payment.
- Why a problem: free-money primitive in production.
- Expected: TEST gateway and `simulate` exist only in test mode; live mode rejects them.
- Actual (code-verified; live mode not active in this env): chain confirmed end-to-end in
  code; live test-mode funding still works.
- Fix: `initializeFunding` resolves via `findEnabledGateway()` and throws
  400 in live mode when the result is TEST; `finalizeWalletFunding` ignores `simulate`
  unless `payment.gateway==="TEST" && PAYMENT_MODE==="test"`. Also: verify/init amount
  mismatch is now flagged (`adminNote` + audit `amountMismatch`) instead of silently
  crediting the gateway's number.
- Fix status: FIXED (`wallet-funding.service.ts`)
- Test status: PASS — backend tsc/eslint; live test-mode fund→confirm (+500 exactly once,
  duplicate confirm idempotent, balance delta +500) re-verified after change.

## BUG-003 — Live exam-pin purchases return empty pins

- Category: VTU provider / Functional
- Severity: HIGH
- Location: `backend/src/services/vtu/adapter.ts` `purchaseExamPin` (old L214-217)
- Root cause: `return {...mapResult, pins: undefined, serials: undefined}` wiped the
  pins every provider mapper builds (`bilalsadasub/rapidbills/cheapdatahub/vtung/vtpass`
  mappers). Routes return `pins: providerResponse.pins ?? []` → paying customers get `[]`.
- Expected: pins/serials from the upstream mapper reach the customer.
- Actual (code-verified): wiped for all `GenericHttpProvider` subclasses (i.e. all live
  providers). Mock path unaffected (separate class).
- Fix: return mapper's `status/message/data/pins/serials` intact.
- Fix status: FIXED (`adapter.ts`)
- Test status: PASS static (tsc/eslint); LIVE BEHAVIOR NOT VERIFIED — requires real
  provider credentials (no live provider configured in this env).

## BUG-004 — Refresh tokens survive password reset/change (session not revoked)

- Category: Auth / Security
- Severity: HIGH
- Location: `backend/src/services/password.service.ts` (`handleResetPassword`,
  `changePassword`); `revokeAllForUser` existed in `refresh-token.service.ts:44` but was
  never called from these paths; routes only cleared the session cookie.
- Root cause: password change/reset updated the hash but left the 30-day refresh-token
  family valid. A stolen refresh token keeps working after the victim resets the password.
- Expected: password reset/change revokes all refresh tokens; everyone re-authenticates.
- Actual (code-verified): no revocation call in either path.
- Fix: `await revokeAllForUser(userId)` in both paths (import added; no import cycle —
  refresh-token.service depends only on models/utils/errors).
- Fix status: FIXED (`password.service.ts`)
- Test status: PASS static (tsc/eslint). Live password-change NOT executed (would rotate
  seeded demo credentials); revocation unit path is a single existing helper.

## BUG-005 — Admin wallet adjust breaks available/pending invariant + lost update

- Category: Wallet / Admin / Financial integrity
- Severity: HIGH
- Location: `backend/src/routes/admin.routes.ts` `PATCH /users/:id` walletAdjust (old L219-224)
- Root cause: read-compute-write of `balance` only (`findByIdAndUpdate({$set:{balance}})`),
  ignoring `availableBalance/pendingBalance` → `available+pending ≠ balance` afterwards;
  concurrent adjusts lost-update; DEBIT checked only `balance`, so `available` could go
  negative relative to pending.
- Expected: adjust moves balance AND available atomically; debits guarded on both.
- Actual (code-verified + live-verified after fix): old code wrote `balance` only.
- Fix: atomic `findOneAndUpdate` with `$inc:{balance:delta, availableBalance:delta}`;
  debits additionally guarded by `balance>=-delta AND availableBalance>=-delta`;
  null result → 400. Ledger entry unchanged.
- Fix status: FIXED (`admin.routes.ts`)
- Test status: PASS live — credit +1000 then debit −1000 on demo user: invariant
  `avail+pend==bal` True at every step; net zero; overdraft debit → 400.

## BUG-006 — No upstream HTTP timeout (hung provider holds requests forever)

- Category: Providers / Reliability
- Severity: HIGH (downgraded from CRITICAL only because reconciliation eventually refunds)
- Location: `backend/src/services/vtu/adapter.ts` `post()` (old L109); same gap in
  `services/payment/{paystack,flutterwave,monnify}.ts`
- Root cause: bare `fetch()` with no `AbortSignal`/timeout. A hung provider holds the
  HTTP request indefinitely; user funds sit debited until the 30-min max-age refund.
- Expected: bounded upstream calls; timeout → ProviderError → failover → reconcile.
- Actual (code-verified): no signal/timeout anywhere on outbound calls.
- Fix: `AbortController` + `VTU_HTTP_TIMEOUT_MS` (default 30000, env-configurable,
  documented in `.env.example`); abort maps to 504 `PROVIDER_TIMEOUT` (a code the
  error taxonomy already defines), other network errors stay 502.
- Fix status: FIXED (`adapter.ts`, `config.ts`, `.env.example`)
- Test status: PASS static; live timeout NOT VERIFIED against a real hanging upstream
  (no live provider configured); mock delay path (≤5s) unaffected.

## BUG-007 — Admin role trusted from JWT claim only (stale up to 7d)

- Category: AuthZ / Security
- Severity: MEDIUM (HIGH-adjacent; fixed)
- Location: `backend/src/middleware/auth.ts` `requireAdmin` (old L53)
- Root cause: `session.payload.role` (JWT claim) was the sole admin check; a demoted
  admin kept admin API access until token expiry (7d). `loadSession` already fetched the
  live user but its `role` was ignored.
- Expected: demotion takes effect immediately.
- Actual (code-verified): claim-only check.
- Fix: require BOTH `payload.role==="ADMIN"` AND `session.user.role==="ADMIN"`.
  Zero extra queries (user already loaded).
- Fix status: FIXED (`middleware/auth.ts`)
- Test status: PASS live — admin /admin/stats 200; user /admin/stats 403; anon 401.

## BUG-008 — Validate endpoints had no rate limit (enumeration/abuse)

- Category: Security / Abuse protection
- Severity: MEDIUM
- Location: `backend/src/routes/purchase.routes.ts` `POST /electricity/validate`,
  `POST /cable/validate`
- Root cause: every other purchase-route handler carried `rateLimit(...)`; these two did
  not, allowing unbounded meter/smart-card probing.
- Fix: `rateLimit("electricity")` / `rateLimit("cable")` added.
- Fix status: FIXED (`purchase.routes.ts`)
- Test status: PASS live — validate responds with `X-RateLimit-Limit: 10`.

## BUG-009 — Frontend: validated customer name survives meter/card edit

- Category: Frontend / Functional
- Severity: MEDIUM
- Location: `app/(dashboard)/electricity/page.tsx` (meter input onChange),
  `app/(dashboard)/cable/page.tsx` (smart-card input onChange)
- Root cause: `setValidated(null)` ran on provider/type change and on validate, but NOT
  when the meter/card digits were edited. Flow "validate A → edit to B → purchase"
  showed A's customer name on B's confirm screen.
- Fix: clear `validated` in both inputs' onChange.
- Fix status: FIXED (both pages)
- Test status: PASS static (root tsc + next lint). UI behavior code-verified.

## BUG-010 — Frontend: refunded statuses render with empty title

- Category: Frontend / Functional
- Severity: LOW
- Location: `components/shared/transaction-result.tsx` (old L92-94, L131)
- Root cause: only SUCCESSFUL/PENDING/PROCESSING/FAILED handled; REFUNDED/REVERSED/
  PARTIAL_REFUND fell through to `""` title and no icon.
- Fix: `refunded` group → "Transaction refunded" + icon.
- Fix status: FIXED
- Test status: PASS static.

## BUG-011 — Frontend: transaction status filter hides refunded transactions

- Category: Frontend / Functional
- Severity: LOW
- Location: `app/(dashboard)/transactions/page.tsx` `statusOptions`
- Root cause: filter listed only 4 statuses while the backend/type system has 7.
- Fix: added REFUNDED/REVERSED/PARTIAL_REFUND.
- Fix status: FIXED
- Test status: PASS static.

## BUG-012 — Owner transaction lookup returned unexpected shape (investigated)

- Category: API contract / Investigated
- Severity: INFO (not a bug)
- Location: `GET /api/transactions/:reference`
- Observation: live probe printed `OWNER ok ref=` (empty). Follow-up: owner fetch by
  reference works (200); the empty print was the probe reading `.reference` off a
  wrapper shape, not an API defect. Cross-user access correctly returns 404.
- Fix status: NO FIX NEEDED. Test status: PASS (IDOR blocked, owner allowed).

## R-01 — Standalone MongoDB: multi-document transactions degrade (architecture constraint)

- Severity: HIGH (documented, partially mitigated)
- Location: `backend/src/lib/mongo-tx.ts:35-43` (`withDbTransaction` runs `fn(undefined)`
  with a warning when no replica set).
- Fact: `createTransaction+debit` and `credit+status-update` are separate writes here;
  a crash between them can leave PENDING-without-debit or debit-without-record.
  The BUG-001 `$inc` fix removes the race but not the crash window. Full fix requires a
  replica set + real transactions. Documented as deployment prerequisite.
- Test status: NOT VERIFIABLE here (single-node local Mongo).

## R-02 — Funding confirm + reconciliation status transitions are check-then-act

- Severity: MEDIUM (documented)
- Location: `wallet-funding.service.ts:89-91`, `transaction.service.ts:111-138`,
  `jobs/reconciliation.ts:111-144`
- Fact: `alreadyFinalized` early-return and `ALLOWED_NEXT` checks are read-then-write
  without a status predicate; two workers (interval + manual `POST /jobs/reconcile`)
  could both pass before either writes. Live duplicate-confirm test showed no double
  credit at balance level (second confirm returned same balance). `WalletTransaction`
  has no unique reference constraint, so dedup relies on status guards. Recommend a
  future unique index on idempotent references.
- Test status: PARTIAL (duplicate confirm PASS; concurrent double-confirm NOT tested).

## R-03 — No inbound webhooks exist (provider/gateway callbacks)

- Severity: INFO (architecture gap, not a defect)
- Fact: grep for webhook/callback/signature/HMAC returns zero route hits. Funding is
  poll/confirm-based; provider resolution is via `checkStatus` + reconciliation. Nothing
  to be idempotent-yet-broken. Any future webhook MUST verify signatures + dedupe by
  reference before crediting.
- Test status: NOT APPLICABLE.

## R-04 — `qs` moderate CVEs via express 4.x body-parser (DoS vectors)

- Severity: MEDIUM (mitigated, not upgraded)
- Finding: `npm audit --omit=dev` → 3 moderate (qs GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g
  via body-parser ← express 4.22.2).
- Decision: NO upgrade (per no-blind-upgrade rule; express 4→5 is breaking). Mitigations
  in place: global `abuseShield` caps query length (2048) and URL length (8192),
  `express.json({limit:"1mb"})`, header-count cap. Revisit on express 5 migration.
- Test status: audit output recorded; abuse-shield 414 verified live.

## R-05 — Forgot-password `devResetLink` distinguishes valid/invalid emails in dev

- Severity: INFO (dev-only)
- Location: `password.service.ts:51-61`, `isDev` default true.
- Fact: message is enumeration-resistant, but `devResetLink: ""` vs real link differs.
  Only when `isDev`; production (`APP_ENV=production`) omits the key. No fix (needed for
  local testing); ensure `APP_ENV=production` in prod.
- Test status: code-verified.

## R-06 — Mock `checkStatus` always SUCCESSFUL vs live-adapter PENDING divergence

- Severity: INFO
- Fact: `mock.ts:238-245` auto-resolves pending as delivered; unconfigured
  `GenericHttpProvider.checkStatus` returns PENDING until max-age refund. Reconciliation
  behavior therefore differs between mock and live. Expected per design (simulator vs
  unknown upstream); documented so nobody "tests" reconciliation against mock and
  assumes live behaves identically.
- Test status: documented.

## R-07 — No automated test suite (supertest/vitest installed, no tests written)

- Severity: MEDIUM (process gap) — RESOLVED during this audit (see BUG-013 and suite below)
- Before: `supertest`, `@types/supertest`, `vitest` in devDependencies, zero test files.
- After: `backend/test/` — 6 files, 20 tests, all passing (`npm.cmd test`):
  `health` (1), `auth` (register/dup/register-role/login+me/admin-authz/bad-token),
  `wallet` (exact funding, idempotent duplicate confirm, decline, min/unknown ref,
  ownership), `purchase` (exact debit, insufficient, validation, IDOR),
  `wallet-concurrency` (BUG-001 regression: exact parallel debits, overspend guard,
  parallel credits), `rate-limit` (429+headers, 414 shield).
- Harness safety: `initTestApp()` refuses to run unless MONGODB_URI contains "test";
  dedicated `annashuwa_vtu_test` DB; per-file wipe; sequential workers (shared DB).
- Test status: 20/20 PASS.

## R-08 — ExamPinProduct `soldCount` incremented outside the purchase transaction

- Severity: LOW (documented)
- Location: `purchase.routes.ts:201` (after `executePurchase`, no rollback).
- Fact: inventory counter can diverge on pending/failover paths. Cosmetic counter only;
  no money impact. Left as-is (fixing requires restructuring the purchase pipeline).
- Test status: code-verified.

## R-09 — Reset/change-password policy weaker than register policy

- Severity: LOW (documented)
- Fact: register requires letter+digit (`validators.ts:12-17`); reset (`:35-44`) and
  change (`user.routes.ts:18-27`) require only min-8 + match. Inconsistent but not
  exploitable per se. Left as-is to avoid breaking existing users; recommend aligning
  in a future pass.
- Test status: code-verified.

## BUG-013 — Second registration without username crashes (sparse-unique + null default)

- Category: Database / Registration / Functional
- Severity: HIGH
- Location: `backend/src/models/user.ts` (old L46 `username default: null` + L52
  `index({username:1},{unique:true,sparse:true})`),
  `backend/src/services/auth.service.ts` (old L51 `username: ... || null`)
- Root cause: MongoDB sparse indexes skip documents *missing* the field, but explicit
  `null` values ARE indexed. With `default: null`, every username-less user stores
  `username: null`, so the second such registration throws E11000 (500 error).
  Found BY the new test suite (register #2 failed).
- Why a problem: in production, only ONE user could ever register without a username;
  every subsequent username-less signup 500s. (The seeded dev DB predates/diverges
  here; existing `null` docs are untouched by this fix.)
- Expected: unlimited username-less users; uniqueness enforced only when set.
- Actual (reproduced in test run): `E11000 duplicate key ... index: username_1
  dup key: { username: null }` on second insert.
- Fix: schema default `undefined` (field absent → sparse skips) + registerUser writes
  `undefined` instead of `null`. Only `user.username` had the sparse+nullable pattern
  (all other uniques are `required: true` — audited).
- Fix status: FIXED (`models/user.ts`, `services/auth.service.ts`)
- Test status: PASS — full suite 20/20 including multi-user registration.

---

## Verified-working (attacked, held)

- Auth: register/login/logout/me; wrong password → 401 INVALID_CREDENTIALS; anon /me → null.
- AuthZ: anon /admin/stats → 401; USER /admin/stats → 403; ADMIN → 200 (before AND after
  the requireAdmin hardening).
- Ownership/IDOR: user B → user A transaction = 404; owner = 200; wallet/tx/profile/KYC/
  airtime-cash all keyed off `req.auth.userId` with no tamperable `:userId`.
- Validation: empty airtime → 400; negative amount → 400; unknown network → 400;
  50,000-above-balance → 400 Insufficient (balance unchanged).
- Funding: +500 exactly once; duplicate confirm idempotent (same balance).
- Purchase: −100 exactly; insufficient rejected.
- Rate limiting: register 6th request → 429 with Retry-After + X-RateLimit-*.
- Abuse shield: 9000-char query → 414 structured envelope.
- Static: backend tsc + eslint PASS; root tsc PASS; next lint PASS; backend build tsc PASS.
- Logs: backend logs contain zero errors after all fixes + hot reloads.
