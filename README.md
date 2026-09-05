# ANNASHUWA VTU

A full-featured Nigerian VTU & digital payments web app (airtime, data, electricity, cable TV, exam PINs, wallet) built with Next.js 15, React 19, TypeScript, Tailwind CSS v4, shadcn/ui components, Prisma ORM and JWT authentication.

Runs **entirely on `http://localhost:3000`** with mock providers and a simulated payment gateway — no external API keys required.

---

## Tech stack

| Area        | Choice                                                       |
| ----------- | ------------------------------------------------------------ |
| Framework   | Next.js 15 (App Router), React 19                            |
| Language    | TypeScript                                                    |
| Styling     | Tailwind CSS v4 + shadcn/ui components                       |
| Database    | Prisma ORM — SQLite (local demo), PostgreSQL-ready schema     |
| Auth        | JWT (jose, HS256) in httpOnly cookie + bcryptjs                |
| Validation  | Zod                                                           |
| Payments    | Abstracted gateway layer: TestGateway (built-in), Paystack, Flutterwave, Monnify |
| Providers   | Mock VTU provider (deterministic success/fail/pending) + HTTP adapter stub |
| Charts      | recharts                                                      |

---

## Quick start (Windows note)

PowerShell blocks `npm.ps1`/`npx.ps1` on some machines → **always use `npm.cmd` / `npx.cmd`**.

```bash
cd annashuwa-vtu

# 1. Install dependencies
npm.cmd install

# 2. Configure environment
# already present in this repo for the local demo (.env)
# to regenerate, copy .env.example -> .env

# 3. Create tables + seed demo data
npx.cmd prisma db push
npx.cmd prisma db seed

# 4. Start dev server
npm.cmd run dev
```

Open **http://localhost:3000**.

---

## Demo / access accounts (seeded)

| Role  | Email                   | Password    | Notes                   |
| ----- | ----------------------- | ----------- | ----------------------- |
| Admin | `admin@annashuwa.com`   | `Admin@1234`| Full admin panel at `/admin` |
| User  | `user@annashuwa.com`    | `User@1234` | Wallet starts at ₦25,000 |

You can also **register a brand new account** from the signup page (no email verification required in demo).

---

## Environment variables (`.env`)

```env
DATABASE_URL="file:./dev.db"          # SQLite (local demo)

JWT_SECRET="dev-secret-change-me"     # session signing

MOCK_MODE="true"                      # use the deterministic mock VTU provider
PAYMENT_MODE="test"                   # "test" (default) or "live"
MOCK_FAIL_RATE="0.1"                  # ~10% of provider calls fail (refunds the wallet)
MOCK_DELAY_MS="1200"                  # simulated provider latency

SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_NAME
SEED_USER_EMAIL / SEED_USER_PASSWORD / SEED_USER_NAME
```

---

## What's included

### User features
- Marketing homepage with services, how-it-works, FAQ, footer
- Register / login / logout, forgot & reset password (dev reset link returned by API)
- Profile management + change password
- Dashboard with wallet balance, quick actions, recent transactions
- **Airtime** — network cards, prefix auto-detection, quick amounts
- **Data bundles** — pick a network, choose a plan, enter the phone number
- **Electricity** — 9 DisCos, prepaid/postpaid, meter validation shows customer name, token delivered in the receipt
- **Cable TV** — DStv / GOtv / StarTimes, smart-card validation, package selection
- **Exam PINs** — WAEC / NECO / NABTEB / JAMB, quantity up to 5, PINs shown with copy
- **Wallet** — balance, deposits/spending breakdown, funding with the built-in **test gateway** (approve or decline to simulate success/failure)
- **Transactions** — search/filter/paginate + printable **receipt** per reference
- Notifications (bell) and dark/light theme

### Admin panel (`/admin`)
- Overview with revenue/volume charts (7-day area chart, per-service bars)
- **Users** — search/filter, suspend/activate, credit/debit wallet with reason + audit trail
- **Transactions** — search/filter across all users + CSV export per page
- **Services** — add/deactivate/delete data plans, manage providers & packages, manage exam PIN products

### Architecture notes
- Server actions avoided in favour of **REST API routes** under `app/api/*`
- All providers/gateways behind interfaces in `services/vtu/*` and `services/payment/*`
- Purchases use a wallet debit → provider call → mark success / **auto-refund on failure** pipeline (`services/purchase.service.ts`)
- Rate limiting for sensitive routes; audit log writes for admin actions
- Sensitive endpoints return `{ error, code }` JSON for easy client handling

---

## Switching to PostgreSQL (production prep)

The schema is written to be provider-portable (no `.prisma` enums, no JSON columns, no `@db.*` annotations).

1. In `prisma/schema.prisma` change:

   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. In `.env`:

   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/annashuwa?schema=public"
   ```

3. Migrate instead of push:

   ```bash
   npx.cmd prisma migrate dev --name init
   npx.cmd prisma db seed
   ```

---

## Mobile apps (Android APK & iOS)

There are two native frontends, both consuming the Next.js REST API over plain HTTP (demo mode), so the server must be reachable from the phone/emulator on the same Wi-Fi:

| Platform | Status | Output |
| -------- | ------ | ------ |
| Android (Capacitor WebView) | Built here | `ANNASHUWA-VTU.apk` (debug, auto-generated debug keystore) |
| Android (native React Native / Expo) | Built here | `ANNASHUWA-VTU-Native.apk` (debug, Expo SDK 54 / RN 0.81) |
| iOS | Project generated | `ios/` — build on a Mac with Xcode (can't compile on Windows) |

### Native React Native app (Expo)

- Source: `expo-app/` (Expo SDK 54, React Native 0.81, TypeScript, React Navigation 7, `@expo/vector-icons`, AsyncStorage).
- Auth is token-based: login/register return a `token`; the app also supports the web `ans_session` cookie via `Authorization: Bearer`.
- API base URL: `expo-app/src/config.ts` (`EXPO_PUBLIC_API_URL` env override). Currently `http://10.82.158.175:3000` — the Wi-Fi IP may change (DHCP); update it there and rebuild/bundle, or override with `EXPO_PUBLIC_API_URL` when starting Metro.
- The native build folder is generated with `npx expo prebuild --platform android`; `app.json` sets package `com.annashuwa.vtu` and `usesCleartextTraffic`.

Build (on this machine; the project is copied to `C:\vtu\expo-app` because React Native's CMake step hits the Windows 260-char path limit under `Documents\Default Project\...`):

```bash
cd /d C:\vtu\expo-app\android
set ANDROID_HOME=C:\Android\sdk
set JAVA_HOME=C:\Android\jdk-21
gradlew.bat assembleDebug -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
REM output: C:\vtu\expo-app\android\app\build\outputs\apk\debug\app-debug.apk
```

- Runs in **Expo Go 54.0.8** too, since it is pinned to Expo SDK 54 (Expo Go bundles one SDK per app version). Start Metro with `npx expo start` and scan the QR code with Expo Go on a phone on the same Wi-Fi. Expo Go 54.0.8 APK: `https://github.com/expo/expo-go-releases/releases/download/Expo-Go-54.0.8/Expo-Go-54.0.8.apk`. (`expo-build-properties` is a prebuild-only config plugin, so it's correctly ignored under Expo Go.)
- Uses Gradle 8.14.3 (pinned to the `gradle-8.14.3-all` distribution in `android/gradle/wrapper/gradle-wrapper.properties`; SDK 57's default 9.3.1 corrupted its transform cache on this machine).
- After building, copy the APK over `ANNASHUWA-VTU-Native.apk`.

### Capacitor WebView app

- `capacitor.config.ts` — app id `com.annashuwa.vtu`, app name, and a `server.url` pointing at the Next.js server on the LAN (adjust the IP if it changes, then `npx.cmd cap sync`).
- Android uses `server.cleartext` + `android:usesCleartextTraffic="true"` for plain HTTP; iOS has an ATS exception in `ios/App/App/Info.plist`.

#### Build the Capacitor Android APK

Prereqs already installed on this machine: JDK 21 (`C:\Android\jdk-21`), Android SDK (`C:\Android\sdk`, pointed to by `android/local.properties`).

```bash
cd android
set ANDROID_HOME=C:\Android\sdk
set JAVA_HOME=C:\Android\jdk-21
gradlew.bat assembleDebug
REM output: android\app\build\outputs\apk\debug\app-debug.apk
```

Install `ANNASHUWA-VTU.apk` or `ANNASHUWA-VTU-Native.apk` on a phone (enable **Install unknown apps**) on the same Wi-Fi as the machine running `npm.cmd run dev`.

### iOS

```bash
# on macOS:
npm.cmd install
npx.cmd cap add ios           # project already generated — use npx.cmd cap sync ios instead
npx.cmd cap sync ios
open ios/App/App.xcworkspace  # set your signing team, pick a device/simulator, Run
```

For App Store / Play Store release: use an HTTPS server URL, set a unique application id, and sign with release keystores/Apple certs.

---

## Going live (optional)

- Set `MOCK_MODE=false`, `PAYMENT_MODE=live` and add gateway keys:
  - `PAYSTACK_SECRET_KEY` / `FLUTTERWAVE_SECRET_KEY` / `MONNIFY_SECRET_KEY`
- Point the VTU adapter at a real aggregator by implementing `services/vtu/http.ts` against your provider's API.
- Set a strong `JWT_SECRET` and `NEXT_PUBLIC_APP_URL`.

---

## Scripts

| Command                  | Purpose                            |
| ------------------------ | ---------------------------------- |
| `npm.cmd run dev`        | Start dev server on :3000          |
| `npm.cmd run build`      | Production build                   |
| `npm.cmd start`          | Serve production build             |
| `npm.cmd run lint`       | Run ESLint                         |
| `npx.cmd tsc --noEmit`   | Type-check                         |
| `npx.cmd prisma studio`  | Browse the database                |
| `npx.cmd prisma db seed` | Re-seed demo data                  |

> Built for a local demo. No real money moves — payments and provider calls are simulated.