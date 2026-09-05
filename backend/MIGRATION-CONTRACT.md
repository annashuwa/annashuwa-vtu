# ANNASHUWA VTU - Backend Migration Contract

> Exact API contract of the existing Next.js 15 (App Router) + Prisma + SQLite backend,
> intended to drive a faithful re-implementation in **Express + MongoDB** without breaking
> the two existing clients (the Next.js web app and the Expo React Native app).
>
> This is a BUILD SPEC. Field names and JSON keys are exact and must not be paraphrased.

---

## 0. Environment & Globals that affect behaviour

`.env.example` (also present in `.env`): DATABASE_URL (file:./dev.db, SQLite), NEXT_PUBLIC_APP_URL=http://localhost:3000, APP_ENV=development, JWT_SECRET, MOCK_MODE=true, VTU_API_BASE_URL, VTU_API_TOKEN, MOCK_FAIL_RATE=0.1, MOCK_DELAY_MS=1200, PAYMENT_MODE=test, PAYSTACK/FLUTTERWAVE/MONNIFY keys + callback URLs (all pointing to http://localhost:3000/wallet), SEED_ADMIN_*, SMTP_*.

Auth/JWT (lib/auth.ts):
- Session JWT: HS256, iat set, issuer `annashuwa-vtu`, audience `annashuwa-vtu-web`, expiry `7d`.
- Secret: process.env.JWT_SECRET ?? "dev-secret-change-me-in-production".
- Cookie: name `ans_session`, httpOnly, secure = (NEXT_PUBLIC_APP_URL starts with https:), sameSite lax, path /, maxAge 7 days.
- Tokens ALSO returned in the response body (`token`) for native clients; native clients send `Authorization: Bearer <token>`.

Error envelope (lib/auth.ts jsonError): `{ "error": "<message>", "code": "<CODE>" }`
- ApiError -> status from error.status, code from error.code.
- Unknown -> 500 `{ "error": "Internal server error", "code": "INTERNAL_ERROR" }`.

lib/audit.ts createAuditLog: only writes when APP_ENV is unset or truthy and non-"production" (logic is effectively a no-op comment); swallows all errors. Best-effort audit.

Rate limiting (lib/rate-limit.ts): in-memory per-process sliding window; identifier = getClientId(req,bucket) = `"bucket:ip"` (x-forwarded-for first value else "local"). Constants: AUTH_RATE_LIMIT {limit:10,window:60}, PURCHASE_RATE_LIMIT {limit:20,window:60}. When exceeded routes throw 429.

---

# A. Route-by-route spec

## Complete `app/api` directory tree

app/api/
|-- admin/
|   |-- stats/route.ts                     GET  /api/admin/stats
|   |-- transactions/route.ts              GET  /api/admin/transactions
|   |-- users/route.ts                     GET  /api/admin/users
|   |-- users/[id]/route.ts                GET+PATCH /api/admin/users/:id
|   `-- services/
|       |-- route.ts                       GET  /api/admin/services
|       |-- providers/route.ts             POST /api/admin/services/providers
|       |-- providers/[id]/route.ts        GET+PATCH+DELETE /api/admin/services/providers/:id
|       |-- data-plans/route.ts            GET+POST /api/admin/services/data-plans
|       |-- data-plans/[id]/route.ts       PATCH+DELETE /api/admin/services/data-plans/:id
|       |-- exam-pins/route.ts             GET+POST+PATCH+DELETE /api/admin/services/exam-pins
|       `-- packages/route.ts              POST+PATCH+DELETE /api/admin/services/packages
|-- airtime/route.ts                       POST /api/airtime
|-- auth/
|   |-- register/route.ts                  POST /api/auth/register
|   |-- login/route.ts                     POST /api/auth/login
|   |-- logout/route.ts                    POST /api/auth/logout (+ GET redirect)
|   |-- me/route.ts                        GET  /api/auth/me
|   |-- forgot-password/route.ts           POST /api/auth/forgot-password
|   `-- reset-password/route.ts            POST /api/auth/reset-password
|-- cable/
|   |-- route.ts                           POST /api/cable
|   |-- providers/route.ts                 GET  /api/cable/providers
|   `-- validate/route.ts                  POST /api/cable/validate
|-- data/
|   |-- route.ts                           POST /api/data
|   `-- plans/route.ts                     GET  /api/data/plans
|-- electricity/
|   |-- route.ts                           POST /api/electricity
|   |-- providers/route.ts                 GET  /api/electricity/providers
|   `-- validate/route.ts                  POST /api/electricity/validate
|-- exam-pins/
|   |-- route.ts                           GET  /api/exam-pins
|   `-- purchase/route.ts                  POST /api/exam-pins/purchase
|-- notifications/
|   |-- route.ts                           GET  /api/notifications
|   `-- read/route.ts                      POST /api/notifications/read
|-- transactions/route.ts                  GET  /api/transactions
|-- user/
|   |-- password/route.ts                  POST /api/user/password
|   `-- profile/route.ts                   GET+PATCH /api/user/profile
`-- wallet/
    |-- route.ts                           GET  /api/wallet
    |-- fund/route.ts                      POST /api/wallet/fund
    `-- fund/confirm/route.ts              POST /api/wallet/fund/confirm

Auth helper semantics (lib/auth.ts):
- getSessionUser(): token from `Authorization: Bearer <t>` else `ans_session` cookie; verify; load user+wallet; return null unless user exists AND status === "ACTIVE". Public but user-aware.
- requireUser(): getSessionUser() else throw ApiError(401, "You must be logged in to perform this action.").
- requireAdmin(): getSessionUser() else 401 "You must be logged in..."; if role !== "ADMIN" throw ApiError(403, "You do not have permission to access this resource.", "API_ERROR").

Serializers (lib/serialize.ts):
- serializeWallet(wallet): `{ id, balance: balance.toString() (STRING decimal), currency, updatedAt: ISO }`.
- serializeUser(user): `{ id, fullName, email, phone, role, status, avatar, emailVerified, createdAt: ISO, wallet?: serializeWallet }`.

IMPORTANT: all Prisma Decimal fields serialize via .toString() -> arrive as JSON strings. Dates via .toISOString().

---

## A1. POST /api/auth/register
- Auth: none
- Rate limit: bucket "register", limit 5, window 60s.
- Zod: registerSchema -> `{ fullName (3-80), email (email, lowercased), phone (10-15, /^\+?[\d\s-]+$/), password (8-72, must contain a letter + a digit), confirmPassword }`, refine password===confirmPassword.

Success (201) EXACT body:
```json
{
  "message": "Account created successfully",
  "user": {
    "id": "<cuid>",
    "fullName": "<trimmed>",
    "email": "<lowercased>",
    "phone": "<trimmed>",
    "role": "USER",
    "status": "ACTIVE",
    "avatar": null,
    "emailVerified": false,
    "createdAt": "<ISO>",
    "wallet": { "id": "<cuid>", "balance": "0", "currency": "NGN", "updatedAt": "<ISO>" }
  },
  "token": "<JWT>"
}
```
- `token` added via attachTokenToBody (merges into JSON, preserves Set-Cookie + status 201).
- Side effects: set cookie ans_session (7d); create User + Wallet (wallet {create:{}}); audit AUTH_REGISTER (entityType User).

Errors:
- 429 "Too many attempts. Please wait a moment." (code API_ERROR default)
- 400 VALIDATION_ERROR (first Zod issue message)
- 409 EMAIL_EXISTS "An account with this email already exists." OR "An account with this phone number already exists."

## A2. POST /api/auth/login
- Auth: none
- Rate limit: bucket "login", limit 10, window 60.
- Zod: loginSchema -> `{ email (email, lowercased), password (min 1) }`; failure -> 400 "Enter a valid email and password." VALIDATION_ERROR.

Success (200): `{ "message": "Login successful", "user": {<serializeUser shape>}, "token": "<JWT>" }`
- Side effects: update user.lastLoginAt = now; set ans_session cookie; audit AUTH_LOGIN.

Errors:
- 401 INVALID_CREDENTIALS "Invalid email or password."
- 403 ACCOUNT_SUSPENDED "This account has been suspended. Contact support."
- 429 "Too many login attempts. Please wait a moment."

## A3. POST /api/auth/logout
- Auth: getSessionUser (if a user, audit AUTH_LOGOUT)
- Success (200): `{ "message": "Logged out" }`; clears ans_session cookie.
- Errors: generic only.

## A4. GET /api/auth/logout (also exported)
- Redirects to `{NEXT_PUBLIC_APP_URL}/login` (default http://localhost:3000/login) and clears the session cookie.

## A5. GET /api/auth/me
- Auth: getSessionUser (public but user-aware)
- Success (200): logged in -> `{ "user": {<serializeUser shape>} }`; not logged in -> `{ "user": null }`.
- No explicit errors.

## A6. POST /api/auth/forgot-password
- Auth: none
- Rate limit: bucket "forgot-password", limit 5, window 300s.
- Zod: forgotPasswordSchema -> `{ email (email, lowercased) }`; failure -> 400 "Enter a valid email address." VALIDATION_ERROR.
- Behavior:
  - No user: 200 `{ "message": "If an account exists for this email, a reset link has been sent.", "devResetLink": "" }` when isDev (APP_ENV==="development" || APP_ENV unset), else no devResetLink key.
  - User: rawToken = crypto.randomBytes(32).toString("hex"); store tokenHash=sha256(rawToken) in PasswordResetToken, expiresAt = now+15min, used=false.
  - If SMTP_HOST set: (TODO, no real mailer sent).
  - Else createNotification INFO "Password reset requested" / "We received a request to reset your password."
  - 200: `{ "message": "If an account exists for this email, a reset link has been sent.", "devResetLink": "<APP_URL>/reset-password?token=<rawToken>" }` (devResetLink only when isDev).
- Errors: 429 "Too many requests. Please wait a few minutes."

## A7. POST /api/auth/reset-password
- Auth: none
- Rate limit: bucket "reset-password", limit 5, window 300.
- Zod: resetPasswordSchema -> `{ token (min 10), password (min 8), confirmPassword }`, refine password===confirmPassword; failure -> 400 "Password must be at least 8 characters and match." VALIDATION_ERROR.
- Behavior: sha256(token); find PasswordResetToken where tokenHash, used=false, expiresAt > now.
  - Not found -> 400 INVALID_TOKEN "This reset link is invalid or has expired. Please request a new one."
  - Success (transaction): update user password (bcrypt 12); mark token used=true; updateMany all other tokens for user (used=false) to used=true.
  - createNotification SUCCESS "Password changed" / "Your password has been reset successfully. You can now sign in."; audit AUTH_PASSWORD_RESET.
  - 200: `{ "message": "Password reset successful. You can now sign in." }`

---

## A8. GET /api/wallet
- Auth: requireUser
- Data: getWalletSummary(user.id) -> wallet + 10 recent WalletTransactions.
- Success (200):
```json
{
  "wallet": { "id": "<cuid>", "balance": "25000", "currency": "NGN", "updatedAt": "<ISO>" },
  "transactions": [{
    "id": "<cuid>", "type": "DEPOSIT", "amount": "1000", "balanceAfter": "26000",
    "status": "SUCCESSFUL", "reference": "<ref>", "description": "Wallet funding via TEST", "createdAt": "<ISO>"
  }]
}
```
(amount/balanceAfter are STRING decimals)

## A9. POST /api/wallet/fund
- Auth: requireUser; rate limit bucket "wallet-fund", limit 5, window 60.
- Zod: fundWalletSchema -> `{ amount (number min 100, max 10000000), gateway (string default "TEST") }`; failure -> 400 first issue VALIDATION_ERROR.
- Behavior/side effects:
  1. reference = generateReference("ANS-FUND") -> `ANS-FUND-YYYYMMDDHHMMSS-<6 upper alnum>`.
  2. create Transaction WALLET_FUNDING, provider=gateway, customerInfo=user.email, description `Wallet top-up of ₦<amount>`, status PENDING, paymentMethod=gateway, metadata {gateway}.
  3. create Payment { reference, userId, transactionId, amount, gateway, status:"PENDING", metadata: JSON.stringify({email, fullName}) }.
  4. provider = getPaymentProvider(gateway); provider.initialize({userId,email,amount,reference,metadata:{fullName,transactionId}}); payment.initData = JSON.stringify(init).
  5. createNotification INFO "Payment initiated" / "A wallet funding of ₦<amount> has been initiated (<gateway>)."
- Success (200): `{ "reference": "ANS-FUND-...", "gateway": "TEST", "authUrl": "<optional>", "message": "<optional>" }`
  (Test gateway returns { reference, gateway:"TEST", message:"Simulated payment initialized. Approve or decline to complete." } - no authUrl.)
- Errors: 429; 400 VALIDATION_ERROR.

## A10. POST /api/wallet/fund/confirm
- Auth: requireUser
- Body: `{ reference: string, simulate?: "success" | "decline" }`. simulate success->SUCCESSFUL, decline->FAILED.
- finalizeWalletFunding(reference, {simulate}):
  - Payment not found -> 404 PAYMENT_NOT_FOUND "Payment reference not found".
  - Idempotent: if already SUCCESSFUL/FAILED -> { payment, alreadyFinalized:true, balance }.
  - simulate -> getTestProvider().resolve(reference, outcome).
  - provider.verify(reference):
    - SUCCESSFUL: credit wallet DEPOSIT amount Number(result.amount||payment.amount), desc "Wallet funding via <gateway>"; payment SUCCESSFUL + verifyData; transaction SUCCESSFUL desc "Wallet funding of ₦<amt> received via <gateway>"; notification SUCCESS "Wallet funded"/"Your wallet has been credited with ₦<amount>."; audit WALLET_FUND_SUCCESS.
    - else: payment FAILED + verifyData; transaction FAILED; notification ERROR "Payment failed"/"Your wallet funding of ₦<amount> was not completed.".
- Ownership: isOwner = payment.userId===user.id || user.role==="ADMIN". If not -> 403 { error:"Not authorized", code:"FORBIDDEN" }.
- Success (200): `{ "status": "SUCCESSFUL", "balance": 26000, "reference": "<ref>" }` (balance is a number).
- Errors: 404 PAYMENT_NOT_FOUND; 403 FORBIDDEN; generic.

---

# Purchase endpoints (airtime/data/electricity/cable/exam-pins)

All share executePurchase (services/purchase.service.ts). Behaviour:
1. getWallet(userId); total = amount + fee; if Number(balance) < total -> 400 "Insufficient wallet balance. Please fund your wallet."
2. create Transaction PENDING (paymentMethod default "WALLET", channel "WEB").
3. debitWallet(total): creates WalletTransaction (mapped type, amount negative, SUCCESSFUL, balanceAfter); guards insufficient (400 "Insufficient wallet balance"), atomic updateMany balance >= amount.
4. call VTU provider execute(getVtuProvider(), txn.reference).
5. provider throw -> refund(amount+fee) as REFUND txn (<reference>-RFND), txn FAILED (desc=err.message), throw 502 PROVIDER_ERROR "Service provider could not process this transaction. Your wallet has been refunded."
6. result handling:
   - SUCCESSFUL: txn SUCCESSFUL + apiResponse; notification SUCCESS "Transaction successful"/"Your <type> of ₦<amount> was successful. Reference: <ref>".
   - FAILED: refund; txn FAILED + apiResponse; notification ERROR "Transaction failed"/result.message.
   - else (PENDING): txn PROCESSING + apiResponse; notification INFO "Transaction processing"/"<message> Reference: <ref>".
7. refetch txn with user (fullName,email,phone) included.
8. return { transaction, providerResponse }.

mapServiceTypeToWalletType: AIRTIME->AIRTIME_PURCHASE, DATA->DATA_PURCHASE, ELECTRICITY->ELECTRICITY_PAYMENT, CABLE->CABLE_SUBSCRIPTION, EXAM_PIN->EXAM_PIN_PURCHASE.

VTU provider types: VtuResponse = { status: "SUCCESSFUL"|"FAILED"|"PENDING", message: string, data?: Record<string,unknown> }; ExamPinResponse = { status, message, pins?: string[], serials?: string[], data? }. Mock provider uses MOCK_MODE/MOCK_FAIL_RATE(0.1)/MOCK_DELAY_MS(1200). getVtuProvider(): MOCK_MODE==="true"? MockVtuProvider : HttpVtuProvider.

NOTE: `transaction` in purchase responses is the FULL Prisma Transaction row (all model fields). Clients model it as TxnItem (money as strings).

## A11. POST /api/airtime
- Auth: requireUser; rate limit bucket "airtime", limit 10, window 60.
- Zod: airtimeSchema -> `{ network (min 2), phone (10-15 phone regex), amount (number min 50, max 100000) }`. Also network must be in ["MTN","Airtel","Glo","9mobile"] else 400 "Unknown network provider" VALIDATION_ERROR.
- executePurchase: serviceType AIRTIME, provider=network, customerInfo=phone, amount, description `"<network> airtime of ₦<amount> to <phone>"`, metadata {network, phone}, execute buyAirtime({network, phone, amount}).
- Success (200): `{ "transaction": {...}, "providerResponse": { status, message, data } }`.

## A12. POST /api/data
- Auth: requireUser; rate limit bucket "data", limit 10, window 60.
- Zod: dataSchema -> `{ network (min 2), phone (phone regex), planId (min 3) }`.
- Load DataPlan by id; missing or !isActive -> 404 PLAN_NOT_FOUND "Data plan not found or unavailable."; plan.network !== network -> 400 PLAN_MISMATCH "Plan does not belong to the selected network."
- planPrice = Number(plan.price); executePurchase: DATA, provider=network, customerInfo=phone, amount=planPrice, desc `"<planName> (<size> - <validity>) to <phone>"`, metadata {network,phone,planId,planName,size}, execute buyData({network,phone,planName,size,amount}).
- Success (200): `{ "transaction": {...}, "providerResponse": {...} }`.

## A13. GET /api/data/plans (public)
- Query: optional ?network=MTN.
- Only isActive===true, ordered network asc, price asc.
- Success (200):
```json
{
  "plans": [{ "id": "<cuid>", "network": "MTN", "planName": "MTN 100MB", "size": "100MB", "validity": "Daily", "price": "170", "oldPrice": "200", "kind": "DATA" }],
  "networks": ["MTN", "Airtel", "Glo", "9mobile"]
}
```
(price/oldPrice STRING; oldPrice null when absent)

---

## A14. POST /api/electricity
- Auth: requireUser; rate limit bucket "electricity", limit 10, window 60.
- Zod: electricitySchema -> `{ provider (min 2), meterNumber (6-30), meterType ("prepaid"|"postpaid"), amount (min 500, max 10000000) }`.
- Load ServiceProvider {code:provider, category:"ELECTRICITY", isActive:true}; not found -> 404 PROVIDER_NOT_FOUND "Electricity provider not found."
- fee = Number(providerRec.fee) (100 for seeded electricity providers).
- executePurchase: ELECTRICITY, provider=providerRec.name, customerInfo=meterNumber, amount, fee, desc `"<name> <meterType> payment for meter <meterNumber>"`, metadata {provider:code, meterNumber, meterType}, execute buyElectricity({providerCode, meterNumber, meterType, amount}).
- Success (200): `{ "transaction": {...}, "providerResponse": {...} }`.

## A15. GET /api/electricity/providers (public)
- ServiceProvider {category:"ELECTRICITY", isActive:true}, ordered name asc.
- Success (200):
```json
{ "providers": [{ "id": "<cuid>", "name": "Ikeja Electric", "code": "ikeja-electric", "description": "IKEDC - ...", "fee": "100" }] }
```

## A16. POST /api/electricity/validate
- Auth: requireUser
- Zod: electricityValidateSchema -> `{ provider (min 2), meterNumber (6-30), meterType ("prepaid"|"postpaid") }`.
- Load provider (same as A14); not found -> 404 PROVIDER_NOT_FOUND.
- vtu.lookupMeter({providerCode, meterNumber, meterType}); if !success -> 400 VALIDATION_FAILED (lookup.message ?? "Meter validation failed").
- Success (200): `{ "name": "<name>", "address": "<address>" }`.

## A17. POST /api/cable
- Auth: requireUser; rate limit bucket "cable", limit 10, window 60.
- Zod: cableSchema -> `{ provider (min 2), smartCard (6-20), packageId (min 3), phone (max 20, optional) }`.
- Load ServiceProvider {code:provider, category:"CABLE", isActive:true} with packages; not found -> 404 PROVIDER_NOT_FOUND "Cable provider not found."
- pkg = providerRec.packages.find(p => p.id===packageId); none or !pkg.isActive -> 404 PACKAGE_NOT_FOUND "Package not found or unavailable."
- fee = Number(providerRec.fee) (0 for seeded cable providers).
- executePurchase: CABLE, provider=providerRec.name, customerInfo=smartCard, amount=Number(pkg.price), fee, desc `"<name> <pkg.name> subscription for smart card <smartCard>"`, metadata {provider:code, smartCard, package:pkg.name, phone}, execute subscribeCable({providerCode, smartCard, packageName, amount}).
- Success (200): `{ "transaction": {...}, "providerResponse": {...} }`.

## A18. GET /api/cable/providers (public)
- ServiceProvider {category:"CABLE", isActive:true} ordered name asc, include active packages ordered price asc.
- Success (200):
```json
{ "providers": [{ "id": "<cuid>", "name": "DStv", "code": "dstv", "description": "MultiChoice DStv subscription", "packages": [{ "id": "<cuid>", "name": "DStv Padi", "price": "2900", "oldPrice": null, "duration": "1 month" }] }] }
```

## A19. POST /api/cable/validate
- Auth: requireUser
- Zod: cableValidateSchema -> `{ provider (min 2), smartCard (6-20) }`.
- Load provider {code, category:"CABLE", isActive:true}; not found -> 404 PROVIDER_NOT_FOUND.
- vtu.lookupSmartCard({providerCode, smartCard}); if !success -> 400 VALIDATION_FAILED ("Smart card validation failed" or lookup.message).
- Success (200): `{ "name": "<name>" }`.

## A20. GET /api/exam-pins (public)
- ExamPinProduct where isActive:true, ordered category asc.
- Success (200):
```json
{ "products": [{ "id": "<cuid>", "name": "WAEC PIN", "category": "WAEC", "price": "2500", "costPrice": "2300", "description": "...", "soldCount": 0 }] }
```

## A21. POST /api/exam-pins/purchase
- Auth: requireUser; rate limit bucket "exam-pins-purchase", limit 5, window 60.
- Zod: examPinSchema -> `{ productId (min 3), phone (10-15 phone regex, optional), quantity (int 1-5, default 1) }`.
- Load ExamPinProduct by id; missing or !isActive -> 404 PRODUCT_NOT_FOUND "Exam PIN product not found or unavailable."
- unitPrice = Number(product.price); total = unitPrice * quantity.
- executePurchase: EXAM_PIN, provider=product.name, customerInfo=phone, amount=total, desc `"<quantity> x <product.name> (₦<unitPrice>)"` (+ ` to <phone>` if phone), metadata {product:name, category, quantity, phone}, execute purchaseExamPin({category, quantity}).
- After: examPinProduct.soldCount += quantity.
- Success (200) EXACT body (flat pins/serials in addition to providerResponse):
```json
{
  "transaction": { "<full Transaction row>" },
  "pins": ["1234-...-...-..."],
  "serials": ["SER-..."],
  "providerResponse": { "status": "SUCCESSFUL", "message": "...", "pins": ["..."], "serials": ["..."], "data": { "category": "WAEC", "quantity": 1 } }
}
```

---

## A22. GET /api/transactions
- Auth: requireUser
- Query: search, serviceType, status, from, to, page (default 1), pageSize (default 10, clamped 5-50).
- listUserTransactions: scoped userId; serviceType/status ignored if "ALL"; from -> createdAt >= from; to -> createdAt <= <to>T23:59:59.999; search OR on reference/provider/customerInfo/description. Order createdAt desc.
- Success (200):
```json
{
  "items": [{
    "id": "<cuid>", "reference": "ANS-...", "serviceType": "AIRTIME", "provider": "MTN",
    "customerInfo": "08012345678", "amount": "1000", "fee": "0", "status": "SUCCESSFUL",
    "description": "MTN airtime of N1000 to 08012345678", "paymentMethod": "WALLET", "createdAt": "<ISO>"
  }],
  "total": 3, "page": 1, "pageSize": 10, "totalPages": 1
}
```

## A23. GET /api/notifications
- Auth: requireUser
- listNotifications(userId,20) + unreadCount(userId).
- Success (200): `{ "data": [{ "id": "<cuid>", "title": "...", "message": "...", "type": "INFO", "isRead": false, "createdAt": "<ISO>" }], "unread": 1 }`.

## A24. POST /api/notifications/read
- Auth: requireUser; marks all user notifications isRead=true.
- Success (200): `{ "ok": true }`.

## A25. GET /api/user/profile
- Auth: requireUser
- Success (200): `{ "user": {<serializeUser shape>} }`.

## A26. PATCH /api/user/profile
- Auth: requireUser
- Inline Zod: `{ fullName (3-80, optional), phone (10-15 phone regex, optional) }`; failure -> 400 first issue VALIDATION_ERROR.
- If phone provided and another user has it -> 409 "This phone number is already in use" (code API_ERROR).
- Updates user (provided fields, trimmed), includes wallet; audit PROFILE_UPDATE.
- Success (200): `{ "user": {<serializeUser shape>} }`.

## A27. POST /api/user/password
- Auth: requireUser
- Inline Zod: `{ currentPassword (min 1), newPassword (min 8), confirmPassword }`, refine new===confirm ("Passwords do not match"); failure -> 400 first issue VALIDATION_ERROR.
- If !verifyPassword(currentPassword, user.password) -> 400 INVALID_PASSWORD "Current password is incorrect".
- Updates password (bcrypt 12); audit PASSWORD_CHANGED; CLEARS session cookie.
- Success (200): `{ "message": "Password changed successfully" }`.

---

# Admin endpoints

All use requireAdmin() -> 401 if not logged in, 403 API_ERROR if not ADMIN.

## A28. GET /api/admin/stats
- Auth: requireAdmin
- Queries: totalUsers, activeUsers, suspendedUsers, totalTransactions, successfulTransactions, failedTransactions, pendingTransactions (status in PENDING|PROCESSING), last-7-day txns, _sum amount WHERE SUCCESSFUL, groupBy serviceType (sum+count), 5 recent users, 5 recent txns (join user fullName/email).
- volumeByDay: last 7 days (weekday short en-NG), sums Number(amount).toFixed(2) per successful/failed/pending(PENDING+PROCESSING) per day key (ISO date slice 0,10).
- Success (200):
```json
{
  "totalUsers": 3, "activeUsers": 3, "suspendedUsers": 0,
  "totalTransactions": 5, "successfulTransactions": 4, "failedTransactions": 1, "pendingTransactions": 0,
  "totalRevenue": "23500.00",
  "volumeByDay": [{ "day": "Sun", "successful": "0.00", "failed": "0.00", "pending": "0.00" }],
  "volumeByService": [{ "serviceType": "AIRTIME", "total": "1000", "count": 1 }],
  "recentUsers": [{ "id": "<cuid>", "fullName": "...", "email": "...", "role": "USER", "status": "ACTIVE", "createdAt": "<ISO>" }],
  "recentTransactions": [{ "id": "<cuid>", "reference": "ANS-...", "serviceType": "AIRTIME", "provider": "MTN", "amount": "1000", "status": "SUCCESSFUL", "user": "Chinedu Okafor", "createdAt": "<ISO>" }]
}
```
(totalRevenue is toFixed(2) STRING; volumeByService.total is _sum.amount?.toString() ?? "0" STRING, count number)

## A29. GET /api/admin/users
- Auth: requireAdmin
- Query: search, role, status, page (min 1, default 1), pageSize (clamped 5-100, default 20). role/status ignored if "ALL". search OR on fullName/email/phone contains.
- Order createdAt desc, include wallet + _count.transactions.
- Success (200):
```json
{
  "users": [{
    "id": "<cuid>", "fullName": "...", "email": "...", "phone": "+2348011111111",
    "role": "USER", "status": "ACTIVE", "walletBalance": "25000", "transactionCount": 2,
    "createdAt": "<ISO>", "lastLoginAt": "<ISO> | null"
  }],
  "total": 3, "page": 1, "pageSize": 20, "totalPages": 1
}
```

## A30. GET /api/admin/users/:id
- Auth: requireAdmin (declares dynamic="force-dynamic")
- Loads user with wallet, 20 recent transactions, 20 recent walletTransactions. If none -> 404 `{ "error": "User not found" }` (no code).
- Success (200):
```json
{
  "user": { "id": "...", "fullName": "...", "email": "...", "phone": "...", "role": "...", "status": "...", "walletBalance": "25000", "createdAt": "<ISO>", "lastLoginAt": "<ISO> | null" },
  "transactions": [{ "id": "..", "reference": "..", "serviceType": "..", "provider": "..", "amount": "..", "status": "..", "createdAt": "<ISO>" }],
  "walletTransactions": [{ "id": "..", "type": "..", "amount": "..", "status": "..", "reference": "..", "createdAt": "<ISO>" }]
}
```

## A31. PATCH /api/admin/users/:id
- Auth: requireAdmin (dynamic)
- Two mutually-exclusive operations:
  1. body.status: validate adminUserStatusSchema ({status:"ACTIVE"|"SUSPENDED"}); invalid -> 400 "Invalid status" VALIDATION_ERROR. Update status. Notification SUCCESS "Account activated"/"Your ANNASHUWA VTU account has been activated." OR ERROR "Account suspended"/"...suspended. Contact support." Audit ADMIN_SET_USER_STATUS (details {status}). Response (200): `{ "status": "ACTIVE" }`.
  2. body.walletAdjust: validate adminWalletSchema ({amount number, type "CREDIT"|"DEBIT", reason 3-200}); invalid -> 400 "Invalid wallet adjustment" VALIDATION_ERROR. delta = CREDIT?amount:-amount; newBalance = Number(balance)+delta; if <0 -> 400 "Adjustment would make balance negative". In transaction: wallet.balance += delta; create WalletTransaction {type:"ADJUSTMENT", amount:delta, balanceAfter:newBalance, status:"SUCCESSFUL", reference:generateReference("ADJ"), description:"Admin credit|debit (<reason>)"}. Audit ADMIN_WALLET_CREDIT/DEBIT ({amount,reason}). Notification INFO "Wallet updated"/"Your wallet was credited|debited with ₦<amount>. <reason>". Response (200): `{ "newBalance": <number> }`.
  3. Otherwise -> 400 `{ "error": "No valid operation provided" }` (no code).

## A32. GET /api/admin/transactions
- Auth: requireAdmin
- Query: search, serviceType, status, from, to, page, pageSize (clamped 5-100, default 20). listAllTransactions (no user scope, includes user fullName/email/phone; search also matches user.fullName and user.email). Order createdAt desc.
- Success (200):
```json
{
  "items": [{
    "id": "<cuid>", "reference": "ANS-...", "serviceType": "AIRTIME", "provider": "MTN",
    "customerInfo": "08012345678", "amount": "1000", "fee": "0", "status": "SUCCESSFUL",
    "description": "...", "paymentMethod": "WALLET",
    "user": "Chinedu Okafor", "userEmail": "user@annashuwa.com", "userId": "<cuid>", "createdAt": "<ISO>"
  }],
  "total": 5, "page": 1, "pageSize": 20, "totalPages": 1
}
```

## A33. GET /api/admin/services
- Auth: requireAdmin
- Optional ?category=ELECTRICITY|CABLE.
- ServiceProvider (category filter or none) ordered category asc, name asc, include packages ordered price asc.
- Success (200):
```json
{ "providers": [{ "id": "<cuid>", "category": "CABLE", "name": "DStv", "code": "dstv", "description": "...", "fee": "0", "isActive": true, "packages": [{ "id": "<cuid>", "name": "DStv Padi", "price": "2900", "duration": "1 month", "isActive": true }] }] }
```

## A34. POST /api/admin/services/providers
- Auth: requireAdmin
- Zod: adminServiceSchema -> `{ category (min 2), name (min 2), code (min 2), description (opt), fee (number >=0, default 0), isActive (default true) }`; invalid -> 400 first issue VALIDATION_ERROR.
- Creates provider. Success (201): `{ "provider": {<full row>} }`.

## A35. GET /api/admin/services/providers/:id
- Auth: requireAdmin. Loads provider include packages. If none -> 404 `{ "error": "Provider not found" }`. Success (200): `{ "provider": {<include packages>} }`.

## A36. PATCH /api/admin/services/providers/:id
- Auth: requireAdmin. Copies isActive(bool), name(str), description(str), fee(number). Updates. Success (200): `{ "provider": {<updated full row>} }`.

## A37. DELETE /api/admin/services/providers/:id
- Auth: requireAdmin. Deletes (cascade packages). Success (200): `{ "ok": true }`.

## A38. GET /api/admin/services/data-plans
- Auth: requireAdmin. All plans ordered network asc, price asc.
- Success (200): `{ "plans": [{ id, network, planName, size, validity, price: "170", oldPrice: "200|null", kind, isActive }] }`.

## A39. POST /api/admin/services/data-plans
- Auth: requireAdmin
- Zod: adminDataPlanSchema -> `{ network (min 2), planName (min 2), size (min 1), validity (min 1), price (>=0), oldPrice (opt number), kind (default "DATA"), isActive (default true) }`; invalid -> 400 first issue VALIDATION_ERROR.
- Creates. Success (201): `{ "plan": {<full plan>, "price": "<string>"} }`.

## A40. PATCH /api/admin/services/data-plans/:id
- Auth: requireAdmin. Copies isActive(bool), network(str), planName(str), size(str), validity(str), price(number), oldPrice(number), kind(str). Success (200): `{ "plan": {<full plan>, "price": "<string>"} }`.

## A41. DELETE /api/admin/services/data-plans/:id
- Auth: requireAdmin. Deletes. Success (200): `{ "ok": true }`.

## A42. GET /api/admin/services/exam-pins
- Auth: requireAdmin. All products ordered category asc.
- Success (200): `{ "products": [{ id, name, category, price: "2500", costPrice: "2300|null", description, isActive, soldCount }] }`.

## A43. POST /api/admin/services/exam-pins
- Auth: requireAdmin. Zod: adminExamPinSchema -> `{ name (min 2), category (min 2), price (>=0), costPrice (opt number), description (opt), isActive (default true) }`; invalid -> 400 first issue VALIDATION_ERROR. Creates. Success (201): `{ "product": {<full row>} }`.

## A44. PATCH /api/admin/services/exam-pins
- Auth: requireAdmin. Body: requires id (else 400 "product id is required" VALIDATION_ERROR), copies name(str), category(str), price(number), costPrice(number), description(str), isActive(bool). Updates by body.id. Success (200): `{ "product": {<full row>} }`.

## A45. DELETE /api/admin/services/exam-pins
- Auth: requireAdmin. Body: { id }; deletes by body.id. Success (200): `{ "ok": true }`.

## A46. POST /api/admin/services/packages
- Auth: requireAdmin. Body: requires providerId, name, price(number) else 400 "providerId, name and price are required" VALIDATION_ERROR. Optional oldPrice(number), duration, description. Creates ServicePackage (isActive default true). Success (201): `{ "pkg": {<full row>} }`.

## A47. PATCH /api/admin/services/packages
- Auth: requireAdmin. Body: requires id else 400 "package id is required" VALIDATION_ERROR; copies name(str), price(number), oldPrice(number), duration(str), isActive(bool). Updates by body.id. Success (200): `{ "pkg": {<full row>} }`.

## A48. DELETE /api/admin/services/packages
- Auth: requireAdmin. Body: { id }; deletes by body.id. Success (200): `{ "ok": true }`.

---

# B. Full Prisma schema

Copied verbatim from `prisma/schema.prisma` - the authoritative data model for the MongoDB re-implementation.

```prisma
// ==============================================================================
// ANNASHUWA VTU - Prisma Schema
// Uses SQLite for zero-config localhost development.
// The schema deliberately avoids provider-specific features (enums, JSON) so it
// works with PostgreSQL too. To switch to PostgreSQL:
//   1. change `provider` below to "postgresql"
//   2. set DATABASE_URL to your postgres connection string
//   3. run `npm run prisma:migrate`
// ==============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ---------- Identity & Access ----------

model User {
  id            String   @id @default(cuid())
  fullName      String
  email         String   @unique
  phone         String   @unique
  password      String // hashed
  role          String   @default("USER") // USER | ADMIN
  status        String   @default("ACTIVE") // ACTIVE | SUSPENDED
  avatar        String?
  emailVerified Boolean  @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  wallet            Wallet?
  walletTransaction WalletTransaction[]
  transactions      Transaction[]
  payments          Payment[]
  notifications     Notification[]
  auditLogs         AuditLog[]
  admin             Admin?
}

// Administrative profile for users with role ADMIN
model Admin {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?
  createdAt DateTime @default(now())
}

// ---------- Wallet ----------

model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance   Decimal  @default(0)
  currency  String   @default("NGN")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions WalletTransaction[]
}

model WalletTransaction {
  id          String   @id @default(cuid())
  walletId    String
  wallet      Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // DEPOSIT | WITHDRAWAL | AIRTIME_PURCHASE | DATA_PURCHASE | ELECTRICITY_PAYMENT
  // | CABLE_SUBSCRIPTION | EXAM_PIN_PURCHASE | REFUND | ADJUSTMENT
  type        String
  amount      Decimal  @default(0)
  balanceAfter Decimal @default(0)
  status      String   @default("SUCCESSFUL") // PENDING | SUCCESSFUL | FAILED
  reference   String
  description String?
  metadata    String?
  transactionId String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([walletId])
  @@index([reference])
  @@index([createdAt])
}

// ---------- Core Transactions ----------

model Transaction {
  id            String   @id @default(cuid())
  reference     String   @unique // public reference, e.g. ANS-XXXXXXXXXX
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  // AIRTIME | DATA | ELECTRICITY | CABLE | EXAM_PIN | WALLET_FUNDING | WITHDRAWAL
  serviceType   String
  provider      String // MTN / IKEDC / DSTV / PAYSTACK / TEST ...
  customerInfo  String? // phone | meter number | smartcard | email
  amount        Decimal  @default(0)
  fee           Decimal  @default(0)
  // PENDING | PROCESSING | SUCCESSFUL | FAILED
  status        String   @default("PENDING")
  description   String?
  metadata      String? // JSON serialized
  paymentMethod String? // WALLET | PAYSTACK | FLUTTERWAVE | MONNIFY | TEST
  channel       String? // WEB | API
  apiResponse   String? // raw provider response (JSON)
  adminNote     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@index([reference])
  @@index([serviceType])
  @@index([status])
  @@index([createdAt])
}

// ---------- Catalogue / Services ----------

model DataPlan {
  id          String  @id @default(cuid())
  network     String // MTN | Airtel | Glo | 9mobile
  planName    String
  size        String // 1GB, 500MB ...
  validity    String // Daily, Weekly, Monthly ...
  price       Decimal
  oldPrice    Decimal?
  kind        String  @default("DATA") // DATA | SME | GIFTING | CORP
  description String?
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([network])
  @@index([isActive])
}

model ServiceProvider {
  id          String   @id @default(cuid())
  // ELECTRICITY | CABLE
  category    String
  name        String // IKEDC, DSTV ...
  code        String   @unique // ikeja-electric, dstv ...
  imageUrl    String?
  description String?
  fee         Decimal  @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  packages ServicePackage[]
}

model ServicePackage {
  id          String   @id @default(cuid())
  providerId  String
  provider    ServiceProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  name        String // DSTV Premium, GOtv Max, Startimes Nova+ ...
  price       Decimal 
  oldPrice    Decimal?
  duration    String? // monthly, yearly ...
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([providerId])
  @@index([isActive])
}

model ExamPinProduct {
  id          String   @id @default(cuid())
  name        String // WAEC, NECO, NABTEB, JAMB ...
  category    String
  price       Decimal 
  costPrice   Decimal?
  description String?
  isActive    Boolean  @default(true)
  soldCount   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive])
}

// ---------- Payments ----------

model Payment {
  id            String   @id @default(cuid())
  reference     String   @unique // gateway reference
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactionId String?
  amount        Decimal 
  // TEST | PAYSTACK | FLUTTERWAVE | MONNIFY
  gateway       String   @default("TEST")
  // PENDING | SUCCESSFUL | FAILED
  status        String   @default("PENDING")
  fee           Decimal  @default(0)
  metadata      String?
  initData      String? // JSON: init request & response payload
  verifyData    String? // JSON: last verification payload
  channel       String? // WEB
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
  @@index([reference])
  @@index([status])
}

// ---------- Notifications ----------

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  type      String   @default("INFO") // INFO | SUCCESS | WARNING | ERROR
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([isRead])
}

// ---------- Auditing ----------

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  action    String
  entityType String?
  entityId  String?
  details   String?
  ip        String?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([tokenHash])
  @@index([expiresAt])
}
```

MongoDB mapping notes:
- @default(cuid()) -> generate cuid-like or ObjectId string id.
- @unique on User.email, User.phone, ServiceProvider.code, Transaction.reference, Payment.reference, Wallet.userId, Admin.userId -> unique indexes.
- Decimal -> store numeric but serialize to clients via .toString() as string.
- @@index(...) -> secondary indexes.
- Relations not enforced; emulate with explicit FK fields + populate.
- metadata/initData/verifyData/apiResponse/details are JSON strings at DB layer; may store natively in MongoDB, but API shape must not change.

---

# C. Seed data (prisma/seed.ts)

seedCatalog() + seedUsers().

## Data plans (DataPlan) - 23 plans across 4 networks
Deterministic IDs: `plan-<network>-<size>` lowercased (e.g. plan-mtn-100mb).
- MTN (8): 100MB N170 (old 200, Daily), 200MB N300 (350, Daily), 500MB N500 (600, Weekly), 1GB N1000 (1200, Monthly), 2GB N1900 (2300), 5GB N4400 (5000), 10GB N8000 (9000), 20GB N15000 (16500) - all Monthly except noted.
- Airtel (6): 100MB N170 (200, Daily), 500MB N500 (600, Weekly), 1GB N1000 (1200), 2GB N1900 (2300), 5GB N4400 (5000), 10GB N8000 (9000) - Monthly except noted.
- Glo (5): 100MB N170 (200, Daily), 500MB N500 (600, Weekly), 1GB N1000 (1200), 2GB N1900 (2300), 5GB N4400 (5000) - Monthly except noted.
- 9mobile (4): 200MB N340 (400, Weekly), 500MB N550 (650, Weekly), 1GB N1050 (1250, Monthly), 2GB N2000 (2400, Monthly).
- upsert updates price/oldPrice; kind defaults "DATA".

## Electricity providers (ServiceProvider, category ELECTRICITY) - 9, fee: 100 each
1. Ikeja Electric `ikeja-electric` "IKEDC - Ikeja Electricity Distribution Company"
2. Eko Electric `eko-electric` "EKEDC - Eko Electricity Distribution Company"
3. Abuja Electric `abuja-electric` "AEDC - Abuja Electricity Distribution Company"
4. Kano Electric `kano-electric` "KEDCO - Kano Electricity Distribution Company"
5. Ibadan Electric `ibadan-electric` "IBEDC - Ibadan Electricity Distribution Company"
6. Benin Electric `benin-electric` "BEDC - Benin Electricity Distribution Company"
7. Enugu Electric `enugu-electric` "EEDC - Enugu Electricity Distribution Company"
8. Jos Electric `jos-electric` "JED - Jos Electricity Distribution Company"
9. Port Harcourt Electric `portharcourt-electric` "PHED - Port Harcourt Electricity Distribution Company"

## Cable providers + packages (ServiceProvider category CABLE + ServicePackage)
Cable providers have NO fee (default 0).
- DStv `dstv`: DStv Padi N2900, Yanga N3600, Confam N7700, Compact N11300, Compact Plus N17800, Premium N24400 (all "1 month"). IDs like `dstv-dstv-padi` (lowercased, spaces->-).
- GOtv `gotv`: Smallie N1900, Jinja N2500, Jolli N3300, Max N6300, Supa N7400 (all "1 month").
- StarTimes `startimes`: Nova N2200, Basic N3200, Classic N4400, Super N10000 (all "1 month").

## Exam PIN products (ExamPinProduct) - 4, IDs `exam-<category>` lowercased
- WAEC PIN / WAEC / N2500 / cost 2300 / "West African Examinations Council registration PIN"
- NECO PIN / NECO / N2300 / cost 2100 / "National Examinations Council registration PIN"
- NABTEB PIN / NABTEB / N2200 / cost 2000 / "National Business and Technical Examinations Board PIN"
- JAMB PIN / JAMB / N5700 / cost 5400 / "Joint Admissions and Matriculation Board ePIN"

## Users / Admin seeding (seedUsers)
- Admin (env-driven, created only if absent): SEED_ADMIN_EMAIL (default admin@annashuwa.com), SEED_ADMIN_PASSWORD (default Admin@1234), SEED_ADMIN_NAME (default "ANNASHUWA Admin"), SEED_ADMIN_PHONE (default +2348000000000). bcrypt.hash(password,12). role ADMIN, status ACTIVE, emailVerified true, wallet {create:{}} (balance 0), admin {create:{}}.
- Demo users (both password "User@1234", bcrypt 12, role USER, status ACTIVE, emailVerified true, wallet {create:{balance:25000}}):
  1. Chinedu Okafor - user@annashuwa.com - +2348011111111
  2. Aisha Bello - demo@annashuwa.com - +2348022222222
- Wallet creation: admin (balance 0) and demo users (balance 25000). Registrations create wallet lazily with balance 0.
- Env-dependent: admin creds from env; seed skipped for existing records.

---

# D. Client contract

## D1. expo-app/src/api/client.ts (logic, near-verbatim)
```ts
import { API_BASE } from '../config';

// Token cache mirrored in memory for synchronous access.
// AuthContext keeps this in sync with AsyncStorage.
let cachedToken: string | null = null;

export function setToken(token: string | null): void {
  cachedToken = token;
}

export function getToken(): string | null {
  return cachedToken;
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError('Cannot reach server. Check that the server is running and the app base URL is correct.', 0);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const errBody = (json ?? {}) as { error?: string; code?: string };
    throw new ApiClientError(errBody.error ?? `Request failed (${res.status})`, res.status, errBody.code);
  }
  return json as T;
}

export const get = <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth });
export const post = <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'POST', body, auth });
export const patch = <T>(path: string, body?: unknown, auth = true) => request<T>(path, { method: 'PATCH', body, auth });
```

Key parity notes:
- Responses read via res.json() - NO 204/statusNoContent handling. Every successful endpoint MUST return a JSON body.
- Auth via `Authorization: Bearer <token>` (token in memory, synced with AsyncStorage by AuthContext).
- Errors: throws ApiClientError(message, status, code) using { error, code } from body. Failed/empty body -> `Request failed (<status>)`.
- No delete/put helpers exported; mobile admin mutations use get/post/patch.

## D2. expo-app/src/config.ts (verbatim)
```ts
// Central app configuration.
// Override the API base URL at build time with EXPO_PUBLIC_API_URL env var.
const DEFAULT_API = 'http://192.168.0.8:3000';

export const APP_NAME = 'ANNASHUWA VTU';
export const APP_TAGLINE = 'Recharge. Pay. Go.';

export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API).replace(/\/+$/, '');

export const DEMO_CREDENTIALS = {
  admin: { email: 'admin@annashuwa.com', password: 'Admin@1234' },
  user: { email: 'user@annashuwa.com', password: 'User@1234' },
} as const;
```
(Default mobile base is LAN IP http://192.168.0.8:3000; must be reachable or overridden via EXPO_PUBLIC_API_URL.)
## D3. Expo TypeScript API types (expo-app/src/types.ts - verbatim)
```ts
// API type definitions mirroring the server contract exactly.
// Money fields arrive as strings (decimal.js serialization).

export type Role = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';

export interface Wallet {
  id: string;
  balance: string;
  currency: string;
  updatedAt: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;
  wallet?: Wallet;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
}

export type TxnStatus = 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'FAILED';

export type ServiceType =
  | 'AIRTIME'
  | 'DATA'
  | 'ELECTRICITY'
  | 'CABLE'
  | 'EXAM_PIN'
  | 'WALLET_FUNDING'
  | 'WITHDRAWAL';

export interface WalletTxn {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  status: string;
  reference: string;
  description: string | null;
  createdAt: string;
}

export interface WalletView {
  wallet: Wallet;
  transactions: WalletTxn[];
}

export interface TxnItem {
  id: string;
  reference: string;
  serviceType: ServiceType;
  provider: string;
  customerInfo: string | null;
  amount: string;
  fee: string;
  status: TxnStatus;
  description: string | null;
  metadata?: string | null;
  paymentMethod?: string | null;
  channel?: string | null;
  apiResponse?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: { fullName: string; email: string; phone: string };
}

export interface TxnPage {
  items: TxnItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DataPlan {
  id: string;
  network: string;
  planName: string;
  size: string;
  validity: string;
  price: string;
  oldPrice: string | null;
  kind: string;
  description?: string | null;
}

export interface ServiceProvider {
  id: string;
  name: string;
  code: string;
  description: string | null;
  fee: string;
  category?: string;
  isActive?: boolean;
}

export interface ServicePackage {
  id: string;
  name: string;
  price: string;
  oldPrice: string | null;
  duration: string | null;
}

export interface CableProvider extends ServiceProvider {
  packages: ServicePackage[];
}

export interface ExamProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  costPrice: string | null;
  description: string | null;
  soldCount: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPage {
  data: Notification[];
  unread: number;
}

export interface ProviderResponse {
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
  message: string;
  data?: Record<string, unknown>;
  pins?: string[];
  serials?: string[];
}

export interface PurchaseResult {
  transaction: TxnItem;
  providerResponse: ProviderResponse | null;
  pins?: string[];
  serials?: string[];
}

export interface FundInit {
  reference: string;
  gateway: string;
  authUrl?: string;
  message?: string;
}

export interface FundConfirm {
  status: 'SUCCESSFUL' | 'FAILED';
  balance?: number;
  reference: string;
}

export interface VolumeByDay {
  day: string;
  successful: string;
  failed: string;
  pending: string;
}

export interface VolumeByService {
  serviceType: string;
  total: string;
  count: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  totalRevenue: string;
  volumeByDay: VolumeByDay[];
  volumeByService: VolumeByService[];
  recentUsers: { id: string; fullName: string; email: string; role: string; status: string; createdAt: string }[];
  recentTransactions: {
    id: string;
    reference: string;
    serviceType: string;
    provider: string;
    amount: string;
    status: string;
    user: string;
    createdAt: string;
  }[];
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  walletBalance: string;
  transactionCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}
```
## D4. lib/api.ts (web client)
```ts
export function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string; code?: string; status: number }> {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  }).then(async (res) => {
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { status: res.status, error: body?.error ?? "Something went wrong", code: body?.code };
    }
    return { status: res.status, data: body as T };
  });
}
```
- The web app uses **cookies** for auth (the `ans_session` cookie set by login/register; no explicit Authorization header). The new backend MUST set the same cookie (`ans_session`, httpOnly, Secure per https context, SameSite=Lax, path `/`, 7-day maxAge) AND return `token` in login/register bodies for the mobile client.
- Reads responses with `.json()`; never 204.

---

# E. Middleware (repo-root middleware.ts, web pages only)

Protects Next.js pages (NOT API routes). Parity behaviour for the web app:
- Reads `ans_session` cookie, verifies JWT (jose jwtVerify, JWT_SECRET). Payload uses `sub` + `role`.
- PROTECTED_PREFIXES = ["/dashboard","/airtime","/data","/electricity","/cable","/exam-pins","/wallet","/transactions","/receipt","/profile"]
- ADMIN_PREFIXES = ["/admin"]
- Admin route without session -> redirect `/login?next=<pathname>`.
- Admin route with non-ADMIN role -> redirect `/dashboard`.
- Protected route without session -> redirect `/login?next=<pathname>`.
- `/login` or `/register` while authenticated -> redirect `/admin` (ADMIN) else `/dashboard`.
- Matcher: "/dashboard/*", "/airtime/*", "/data/*", "/electricity/*", "/cable/*", "/exam-pins/*", "/wallet/*", "/transactions/*", "/receipt/*", "/profile/*", "/admin/*", "/login", "/register".

This is page-level; the API routes enforce auth via requireUser/requireAdmin (Section A). Cookie name + JWT semantics must stay identical for web.

---

# Cross-cutting implementation checklist (Express + MongoDB rewrite)
1. Money: all Decimal fields must serialize as STRINGS (via .toString()).
2. Dates: createdAt/updatedAt/lastLoginAt/expiresAt -> ISO strings.
3. Login/Register: set cookie `ans_session` AND return `token` in body.
4. Auth helpers: requireUser (401), requireAdmin (401 then 403), getSessionUser (public, status ACTIVE check).
5. Error envelope: `{ error, code }`; default code API_ERROR; internal 500 `{error:"Internal server error", code:"INTERNAL_ERROR"}`.
6. Rate-limit buckets + limits/windows exactly per route: register 5/60, login 10/60, forgot-password 5/300, reset-password 5/300, wallet-fund 5/60, airtime/data/electricity/cable 10/60, exam-pins-purchase 5/60. 429 when exceeded.
7. Reference format: generateReference(prefix="ANS") -> `PREFIX-YYYYMMDDHHMMSS-<6 upper alnum>`.
8. Purchase flow: create PENDING txn -> debit wallet (+fee) -> call provider -> SUCCESSFUL/FAILED(refund)/PROCESSING -> notification. Refund reference `<txnRef>-RFND`, wallet txn type REFUND.
9. Wallet debit types: AIRTIME_PURCHASE, DATA_PURCHASE, ELECTRICITY_PAYMENT, CABLE_SUBSCRIPTION, EXAM_PIN_PURCHASE; credit type DEPOSIT; adjustment type ADJUSTMENT.
10. Payment gateways: TEST (default when PAYMENT_MODE != live or no keys), PAYSTACK, FLUTTERWAVE, MONNIFY - resolution per findEnabledGateway.
