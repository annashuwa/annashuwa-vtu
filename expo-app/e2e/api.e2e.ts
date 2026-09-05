/**
 * End-to-end test of the ANNASHUWA VTU *app* against the live backend.
 *
 * This drives the app's own networking layer (`src/api/client.ts`) against the
 * running Next.js server, calling the exact endpoints/bodies each app screen
 * uses — mirroring the real user journeys (auth, wallet, purchases, history,
 * notifications, profile, admin).
 *
 * Run from the project root (server must be up on API_BASE):
 *   npx tsx expo-app/e2e/api.e2e.ts
 */
import { get, post, patch, setToken, ApiClientError } from '../src/api/client';
import { API_BASE } from '../src/config';
import type {
  User,
  WalletView,
  TxnPage,
  PurchaseResult,
  FundInit,
  FundConfirm,
  DataPlan,
  CableProvider,
  ServiceProvider,
  ExamProduct,
  NotificationPage,
  AdminStats,
  AdminUserRow,
} from '../src/types';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(label: string): void {
  passed += 1;
  console.log(`  \u2713 ${label}`);
}
function fail(label: string, err?: unknown): void {
  failed += 1;
  failures.push(label);
  console.error(`  \u2717 ${label}${err instanceof Error ? ` — ${err.message}` : ''}`);
}
function check(cond: boolean, label: string, detail?: string): void {
  if (cond) ok(label);
  else fail(label, new Error(detail ?? 'assertion failed'));
}

async function succeed<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  let attempt = fn;
  for (let i = 0; i < 2; i += 1) {
    try {
      const data = await attempt();
      ok(label);
      return data;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 429 && i === 0) {
        console.log(`  ... rate limited, waiting 65s then retrying (${label})`);
        await sleep(65000);
        attempt = fn;
        continue;
      }
      fail(label, err);
      return null;
    }
  }
  return null;
}

async function expectError(
  label: string,
  fn: () => Promise<unknown>,
  opts: { status?: number; code?: string; message?: string } = {}
): Promise<ApiClientError | null> {
  let attempt = fn;
  for (let i = 0; i < 2; i += 1) {
    try {
      await attempt();
      fail(label, new Error(`expected an error but request succeeded`));
      return null;
    } catch (err) {
      if (!(err instanceof ApiClientError)) {
        fail(label, new Error(`expected ApiClientError, got ${String(err)}`));
        return null;
      }
      if (err.status === 429 && i === 0) {
        console.log(`  ... rate limited, waiting 65s then retrying (${label})`);
        await sleep(65000);
        attempt = fn;
        continue;
      }
      const checks = [
        opts.status === undefined ? null : err.status === opts.status,
        opts.code === undefined ? null : err.code === opts.code,
        opts.message === undefined ? null : err.message.includes(opts.message),
      ].filter((c) => c !== null);
      if (checks.every(Boolean)) ok(label);
      else fail(label, new Error(`status=${err.status} code=${err.code} message="${err.message}"`));
      return err;
    }
  }
  return null;
}

function money(n: unknown): number {
  return Number(String(n));
}

// ---------------------------------------------------------------------------
const EMAIL = `e2e.user.${Date.now()}@annashuwa.com`;
const PHONE = `+234809${String(Date.now()).slice(-7)}`;
const PASS1 = 'E2ePass@2026A';
const PASS2 = 'E2eReset@2026B';
const PASS3 = 'E2eChange@2026C';
const ADMIN = { email: 'admin@annashuwa.com', password: 'Admin@1234' };
const FUND_AMOUNT = 25000;
const AIRTIME_AMOUNT = 100;
let e2eUserToken = '';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  console.log(`\nANNASHUWA VTU app -> backend E2E`);
  console.log(`API_BASE: ${API_BASE}`);
  console.log(`Test user: ${EMAIL} / ${PHONE}`);
  console.log(`\n[1/8] Connectivity & public catalog`);
  {
    const me = await succeed('GET /api/auth/me (anonymous) -> 200 {user:null}', () =>
      get<{ user: User | null }>('/api/auth/me', false)
    );
    check(me?.user === null, 'anonymous /me has user=null');

    const plans = await succeed('GET /api/data/plans (public)', () =>
      get<{ plans: DataPlan[]; networks: string[] }>('/api/data/plans', false)
    );
    check((plans?.plans.length ?? 0) > 0, 'data plans non-empty');

    const elec = await succeed('GET /api/electricity/providers (public)', () =>
      get<{ providers: ServiceProvider[] }>('/api/electricity/providers', false)
    );
    check((elec?.providers.length ?? 0) > 0, 'electricity providers non-empty');

    const cable = await succeed('GET /api/cable/providers (public)', () =>
      get<{ providers: CableProvider[] }>('/api/cable/providers', false)
    );
    check((cable?.providers.length ?? 0) > 0, 'cable providers non-empty');
    check((cable?.providers[0]?.packages.length ?? 0) > 0, 'cable providers include packages');

    const exams = await succeed('GET /api/exam-pins (public)', () =>
      get<{ products: ExamProduct[] }>('/api/exam-pins', false)
    );
    check((exams?.products.length ?? 0) > 0, 'exam pin products non-empty');
  }

  console.log(`\n[2/8] Auth guards`);
  {
    await expectError('GET /api/wallet without token -> 401', () => get('/api/wallet'), { status: 401 });
    await expectError('GET /api/admin/stats without token -> 401', () => get('/api/admin/stats'), { status: 401 });
  }

  console.log(`\n[3/8] Register -> login -> me`);
  let userId = '';
  const reg = await succeed('POST /api/auth/register -> 201 + token', () =>
    post<{ message: string; user: User; token?: string }>(
      '/api/auth/register',
      { fullName: 'E2E Test User', email: EMAIL, phone: PHONE, password: PASS1, confirmPassword: PASS1 },
      false
    )
  );
  if (reg) {
    userId = reg.user.id;
    check(reg.user.email === EMAIL, 'registered user email matches');
    check(reg.user.wallet?.balance === '0' || money(reg.user.wallet?.balance) === 0, 'new wallet balance is 0');
    check(typeof reg.token === 'string' && reg.token.length > 10, 'register returns auth token');
    setToken(reg.token ?? null);
  }

  const me = await succeed('GET /api/auth/me (with token)', () => get<{ user: User | null }>('/api/auth/me'));
  check(me?.user?.email === EMAIL, 'me returns the registered user');

  await expectError('POST /api/auth/login wrong password -> 401', () =>
    post('/api/auth/login', { email: EMAIL, password: 'WrongPass1' }, false),
    { status: 401, code: 'INVALID_CREDENTIALS' }
  );

  console.log(`\n[4/8] Forgot / reset password`);
  {
    const forgot = await succeed('POST /api/auth/forgot-password -> devResetLink', () =>
      post<{ message: string; devResetLink?: string }>('/api/auth/forgot-password', { email: EMAIL }, false)
    );
    const link = forgot?.devResetLink ?? '';
    const token = link.split('token=')[1] ?? '';
    check(link.length > 0 && token.length > 0, 'dev reset link contains a token');

    const reset = await succeed('POST /api/auth/reset-password', () =>
      post<{ message: string }>(
        '/api/auth/reset-password',
        { token, password: PASS2, confirmPassword: PASS2 },
        false
      )
    );
    check(typeof reset?.message === 'string', 'reset-password returns message');
  }

  console.log(`\n[5/8] Wallet funding`);
  let balance = 0;
  let fundCtx: FundInit | null = null;
  {
    const wallet = await succeed('GET /api/wallet', () => get<WalletView>('/api/wallet'));
    check(typeof wallet?.wallet.balance === 'string', 'wallet.balance is a string');

    fundCtx = await succeed('POST /api/wallet/fund', () =>
      post<FundInit>('/api/wallet/fund', { amount: FUND_AMOUNT, gateway: 'TEST' })
    );
    check(typeof fundCtx?.reference === 'string' && (fundCtx?.reference.length ?? 0) > 0, 'fund init returns reference');
    check(fundCtx?.gateway === 'TEST', 'fund init returns TEST gateway');

    const confirm = await succeed('POST /api/wallet/fund/confirm (simulate success)', () =>
      post<FundConfirm>('/api/wallet/fund/confirm', { reference: fundCtx?.reference, simulate: 'success' })
    );
    check(confirm?.status === 'SUCCESSFUL', 'fund confirm resolves to SUCCESSFUL');
    check(money(confirm?.balance) === FUND_AMOUNT, `fund confirm balance = ${FUND_AMOUNT}`);
    balance = money(confirm?.balance);

    const confirm2 = await succeed('POST /api/wallet/fund/confirm (idempotent)', () =>
      post<FundConfirm>('/api/wallet/fund/confirm', { reference: fundCtx?.reference, simulate: 'success' })
    );
    check(confirm2?.status === 'SUCCESSFUL', 're-confirm stays SUCCESSFUL');
    check(money(confirm2?.balance) === balance, 're-confirm does not double-credit');

    const wallet2 = await succeed('GET /api/wallet (after funding)', () => get<WalletView>('/api/wallet'));
    check(money(wallet2?.wallet.balance) === FUND_AMOUNT, 'wallet reflects funded balance');
    check((wallet2?.transactions.length ?? 0) >= 1, 'wallet transactions contains deposit');
  }

  console.log(`\n[6/8] Purchases (airtime/data/electricity/cable/exam-pins)`);
  {
    const plansRes = await get<{ plans: DataPlan[] }>('/api/data/plans', false);
    const mtnPlan = plansRes.plans.filter((p) => p.network === 'MTN')[0];
    check(!!mtnPlan, 'found an MTN data plan to buy');

    const before = money((await get<WalletView>('/api/wallet')).wallet.balance);

    const airtime = await succeed('POST /api/airtime', () =>
      post<PurchaseResult>('/api/airtime', { network: 'MTN', phone: PHONE, amount: AIRTIME_AMOUNT })
    );
    check(typeof airtime?.transaction.reference === 'string', 'airtime txn has reference');
    check(['SUCCESSFUL', 'FAILED', 'PROCESSING'].includes(airtime?.transaction.status ?? ''), 'airtime txn status valid');
    const airtimeSpend = airtime && airtime.transaction.status !== 'FAILED' ? AIRTIME_AMOUNT : 0;

    const data = await succeed('POST /api/data', () =>
      post<PurchaseResult>('/api/data', { network: 'MTN', phone: PHONE, planId: mtnPlan.id })
    );
    check(typeof data?.transaction.reference === 'string', 'data txn has reference');
    const dataSpend = data && data.transaction.status !== 'FAILED' ? money(mtnPlan.price) : 0;

    const elecProviders = await get<{ providers: ServiceProvider[] }>('/api/electricity/providers', false);
    const elecProvider = elecProviders.providers[0];
    const meterNumber = '12345678901';
    const validateMeter = await succeed('POST /api/electricity/validate', () =>
      post<{ name: string; address?: string }>('/api/electricity/validate', {
        provider: elecProvider.code,
        meterNumber,
        meterType: 'prepaid',
      })
    );
    check(typeof validateMeter?.name === 'string' && (validateMeter.name.length ?? 0) > 0, 'meter validation returns owner name');

    const elec = await succeed('POST /api/electricity', () =>
      post<PurchaseResult>('/api/electricity', {
        provider: elecProvider.code,
        meterNumber,
        meterType: 'prepaid',
        amount: 500,
      })
    );
    check(typeof elec?.transaction.reference === 'string', 'electricity txn has reference');
    const elecSpend = elec && elec.transaction.status !== 'FAILED' ? 500 + money(elecProvider.fee) : 0;

    const cableProviders = await get<{ providers: CableProvider[] }>('/api/cable/providers', false);
    const dstv = cableProviders.providers.find((p) => p.code === 'dstv') ?? cableProviders.providers[0];
    const pkg = dstv.packages[0];
    const smartCard = '1234567890123';
    const validateCard = await succeed('POST /api/cable/validate', () =>
      post<{ name: string }>('/api/cable/validate', { provider: dstv.code, smartCard })
    );
    check(typeof validateCard?.name === 'string' && (validateCard.name.length ?? 0) > 0, 'smartcard validation returns subscriber name');

    const cable = await succeed('POST /api/cable', () =>
      post<PurchaseResult>('/api/cable', { provider: dstv.code, smartCard, packageId: pkg.id, phone: PHONE })
    );
    check(typeof cable?.transaction.reference === 'string', 'cable txn has reference');
    const cableSpend = cable && cable.transaction.status !== 'FAILED' ? money(pkg.price) : 0;

    const exams = await get<{ products: ExamProduct[] }>('/api/exam-pins', false);
    const examProduct = exams.products[0];
    const exam = await succeed('POST /api/exam-pins/purchase', () =>
      post<PurchaseResult>('/api/exam-pins/purchase', { productId: examProduct.id, phone: PHONE, quantity: 1 })
    );
    check(typeof exam?.transaction.reference === 'string', 'exam pin txn has reference');
    if (exam?.transaction.status === 'SUCCESSFUL') check((exam.pins?.length ?? 0) >= 1, 'successful exam pin purchase returns pins');
    const examSpend = exam && exam.transaction.status !== 'FAILED' ? money(examProduct.price) : 0;

    const after = money((await get<WalletView>('/api/wallet')).wallet.balance);
    const expected = before - (airtimeSpend + dataSpend + elecSpend + cableSpend + examSpend);
    check(after === expected, `wallet decreases by purchases (${before} -> ${after}, expected ${expected})`);

    await expectError('POST /api/airtime with large amount -> 400 insufficient funds', () =>
      post<PurchaseResult>('/api/airtime', { network: 'MTN', phone: PHONE, amount: 50000 }),
      { status: 400, message: 'Insufficient' }
    );
  }

  console.log(`\n[7/8] Transactions, notifications, profile, password`);
  {
    const txns = await succeed('GET /api/transactions?pageSize=10', () =>
      get<TxnPage>('/api/transactions?pageSize=10')
    );
    check((txns?.items.length ?? 0) >= 1, 'transaction list non-empty');
    check(typeof txns?.total === 'number', 'transaction list returns total');

    const airtimeTxns = await succeed('GET /api/transactions?serviceType=AIRTIME', () =>
      get<TxnPage>('/api/transactions?serviceType=AIRTIME')
    );
    check(
      (airtimeTxns?.items ?? []).every((t) => t.serviceType === 'AIRTIME'),
      'serviceType filter works'
    );

    const notifs = await succeed('GET /api/notifications', () => get<NotificationPage>('/api/notifications'));
    check(Array.isArray(notifs?.data) && typeof notifs?.unread === 'number', 'notifications payload shaped correctly');

    const markRead = await succeed('POST /api/notifications/read', () =>
      post<{ ok: boolean }>('/api/notifications/read')
    );
    check(markRead?.ok === true, 'mark-read returns ok');

    const notifs2 = await succeed('GET /api/notifications (after read)', () =>
      get<NotificationPage>('/api/notifications')
    );
    check(notifs2?.unread === 0, 'unread count is 0 after marking read');

    const profile = await succeed('PATCH /api/user/profile', () =>
      patch<{ user: User }>('/api/user/profile', { fullName: 'E2E User Updated', phone: PHONE })
    );
    check(profile?.user.fullName === 'E2E User Updated', 'profile fullName updated');
    check(profile?.user.email === EMAIL, 'profile email unchanged');

    const profileGet = await succeed('GET /api/user/profile', () => get<{ user: User }>('/api/user/profile'));
    check(profileGet?.user.fullName === 'E2E User Updated', 'profile GET reflects update');

    const pwd = await succeed('POST /api/user/password', () =>
      post<{ message: string }>('/api/user/password', {
        currentPassword: PASS2,
        newPassword: PASS3,
        confirmPassword: PASS3,
      })
    );
    check(typeof pwd?.message === 'string', 'password change returns message');

    await expectError('login with old password -> 401', () =>
      post('/api/auth/login', { email: EMAIL, password: PASS2 }, false),
      { status: 401 }
    );

    const relog = await succeed('login with new password', () =>
      post<{ user: User; token?: string }>(
        '/api/auth/login',
        { email: EMAIL, password: PASS3 },
        false
      )
    );
    check(typeof relog?.token === 'string' && (relog.token.length ?? 0) > 0, 'login returns token');
    e2eUserToken = relog?.token ?? '';
    setToken(e2eUserToken);
  }

  console.log(`\n[8/8] Admin`);
  let adminToken = '';
  let e2eUserId = userId;
  {
    const adminLogin = await succeed('admin login', () =>
      post<{ user: User; token?: string }>(
        '/api/auth/login',
        { email: ADMIN.email, password: ADMIN.password },
        false
      )
    );
    check(adminLogin?.user.role === 'ADMIN', 'admin login returns role ADMIN');
    adminToken = adminLogin?.token ?? '';
    setToken(adminToken);

    const stats = await succeed('GET /api/admin/stats', () => get<AdminStats>('/api/admin/stats'));
    check(typeof stats?.totalUsers === 'number' && stats.totalUsers > 0, 'stats totalUsers > 0');
    check(Array.isArray(stats?.volumeByService) && Array.isArray(stats?.recentUsers), 'stats arrays present');

    const users = await succeed('GET /api/admin/users?search=' + EMAIL, () =>
      get<{ users: AdminUserRow[]; total: number; totalPages: number }>(
        `/api/admin/users?search=${encodeURIComponent(EMAIL)}&page=1&pageSize=10`
      )
    );
    const row = users?.users.find((u) => u.email === EMAIL) ?? null;
    check(row !== null, 'admin users search finds the E2E user');
    check(typeof row?.transactionCount === 'number', 'admin user row has transactionCount');
    if (row) e2eUserId = row.id;

    const userDetail = await succeed('GET /api/admin/users/:id', () =>
      get<{ user: { id: string; email: string }; transactions: unknown[]; walletTransactions: unknown[] }>(
        `/api/admin/users/${e2eUserId}`
      )
    );
    check(userDetail?.user.email === EMAIL, 'admin user detail matches');
    check((userDetail?.walletTransactions.length ?? 0) >= 1, 'admin user detail includes wallet transactions');

    const adminTxns = await succeed('GET /api/admin/transactions?pageSize=10', () =>
      get<{ items: { user: string; userEmail: string }[] }>('/api/admin/transactions?pageSize=10')
    );
    check((adminTxns?.items.length ?? 0) >= 1, 'admin transactions list non-empty');
    check(typeof adminTxns?.items[0]?.user === 'string', 'admin transactions include user name');

    const services = await succeed('GET /api/admin/services', () =>
      get<{ providers: { id: string; code: string; packages: unknown[] }[] }>('/api/admin/services')
    );
    check((services?.providers.length ?? 0) === 12 || (services?.providers.length ?? 0) > 0, 'admin services list non-empty');

    const created = await succeed('POST /api/admin/services/providers', () =>
      post<{ provider: { id: string; code: string; isActive: boolean } }>('/api/admin/services/providers', {
        category: 'ELECTRICITY',
        name: 'E2E Electric',
        code: `e2e-electric-${Date.now()}`,
        description: 'Created by E2E test',
        fee: 100,
        isActive: true,
      })
    );
    const providerId = created?.provider.id ?? '';
    check(created?.provider.isActive === true, 'provider created as active');

    const patched = await succeed('PATCH /api/admin/services/providers/:id (deactivate)', () =>
      patch<{ provider: { id: string; isActive: boolean } }>(`/api/admin/services/providers/${providerId}`, {
        isActive: false,
      })
    );
    check(patched?.provider.isActive === false, 'provider deactivated');

    const deleted = await succeed('DELETE /api/admin/services/providers/:id', () => {
      return fetch(`${API_BASE}/api/admin/services/providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      }).then((r) => {
        if (!r.ok) throw new ApiClientError(`DELETE failed (${r.status})`, r.status);
        return r.json() as Promise<{ ok: boolean }>;
      });
    });
    check(deleted?.ok === true, 'provider deleted');

    const adjusted = await succeed('PATCH /api/admin/users/:id walletAdjust', () =>
      patch<{ newBalance: number }>(`/api/admin/users/${e2eUserId}`, {
        walletAdjust: { amount: 1000, type: 'CREDIT', reason: 'E2E test credit' },
      })
    );
    check(money(adjusted?.newBalance) > 0, 'admin wallet credit increases balance');

    const suspended = await succeed('PATCH /api/admin/users/:id suspend', () =>
      patch<{ status: string }>(`/api/admin/users/${e2eUserId}`, { status: 'SUSPENDED' })
    );
    check(suspended?.status === 'SUSPENDED', 'user suspended by admin');

    setToken(e2eUserToken || null);
    const suspendedMe = await succeed('suspended user /me', () => get<{ user: User | null }>('/api/auth/me'));
    check(suspendedMe?.user === null, 'suspended user is signed out (/me user null)');

    await expectError('suspended user login -> 403', () =>
      post('/api/auth/login', { email: EMAIL, password: PASS3 }, false),
      { status: 403, code: 'ACCOUNT_SUSPENDED' }
    );

    setToken(adminToken);
    const reactivated = await succeed('PATCH /api/admin/users/:id reactivate', () =>
      patch<{ status: string }>(`/api/admin/users/${e2eUserId}`, { status: 'ACTIVE' })
    );
    check(reactivated?.status === 'ACTIVE', 'user reactivated by admin');

    const userRelogin = await succeed('user can log in again after reactivation', () =>
      post<{ user: User; token?: string }>(
        '/api/auth/login',
        { email: EMAIL, password: PASS3 },
        false
      )
    );
    setToken(userRelogin?.token ?? null);
    await expectError('user token on admin route -> 403', () => get('/api/admin/stats'), { status: 403 });
    const meAfter = await succeed('GET /api/auth/me (reactivated user)', () => get<{ user: User | null }>('/api/auth/me'));
    check(meAfter?.user?.email === EMAIL, 'reactivated user /me works');
  }

  console.log(`\n----------------------------------------------------`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log(`Failed: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('E2E aborted:', err);
  process.exit(1);
});