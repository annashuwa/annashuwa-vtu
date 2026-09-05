export type ServiceType =
  | "AIRTIME"
  | "DATA"
  | "ELECTRICITY"
  | "CABLE"
  | "EXAM_PIN"
  | "WALLET_FUNDING"
  | "WITHDRAWAL";

export type TxnStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESSFUL"
  | "FAILED"
  | "REFUNDED"
  | "REVERSED"
  | "PARTIAL_REFUND";

export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  avatar: string | null;
  emailVerified: boolean;
  createdAt: string;
  wallet?: Wallet;
}

export interface Wallet {
  id: string;
  balance: string;
  availableBalance?: string;
  pendingBalance?: string;
  currency: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  status: string;
  reference: string;
  description: string | null;
  createdAt: string;
  transactionId: string | null;
}

export interface VtuTransaction {
  id: string;
  reference: string;
  serviceType: ServiceType;
  provider: string;
  providerId?: string | null;
  providerName?: string | null;
  providerReference?: string | null;
  customerInfo: string | null;
  amount: string;
  fee: string;
  costPrice?: string | null;
  profit?: string | null;
  refundedAmount?: string | null;
  status: TxnStatus;
  description: string | null;
  metadata: string | null;
  paymentMethod: string | null;
  adminNote?: string | null;
  apiResponse?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Runtime readiness of a VTU provider, from GET /api/admin/vtu/providers. */
export interface ProviderReadiness {
  id: string;
  name: string;
  live: boolean;
  mode: "mock" | "http";
  configured: boolean;
  capabilities: { airtime: boolean; data: boolean; electricity: boolean; cable: boolean; examPins: boolean };
  active: boolean;
  lastHealth: { provider: string; ok: boolean; latencyMs: number; checkedAt: string; error?: string } | null;
}

/** Status of the reconciliation background job, from GET /api/admin/jobs. */
export interface ReconcileStatus {
  enabled: boolean;
  intervalMs: number;
  graceMs: number;
  maxAgeMs: number;
  running: boolean;
  lastRun: string | null;
  lastSummary: { examined: number; resolved: number; refunded: number; stillPending: number; errors: number } | null;
}

export interface ReconcileSummaryData {
  examined: number;
  resolved: number;
  refunded: number;
  stillPending: number;
  errors: number;
}

/** One candidate from the routing engine, from GET /api/admin/vtu/route. */
export interface RouteCandidate {
  providerId: string;
  name: string;
  live: boolean;
  cost: number | null;
  profit: number | null;
  marginRate: number | null;
}

/** Routing decision, from GET /api/admin/vtu/route. */
export interface RouteDecision {
  serviceType: string;
  candidates: RouteCandidate[];
  selected: RouteCandidate | null;
  fallbacks: RouteCandidate[];
  preferred: boolean;
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
}

export interface ServiceProvider {
  id: string;
  category: "ELECTRICITY" | "CABLE";
  name: string;
  code: string;
  imageUrl: string | null;
  description: string | null;
  fee: string;
  isActive: boolean;
  packages?: ServicePackage[];
}

export interface ServicePackage {
  id: string;
  name: string;
  price: string;
  oldPrice: string | null;
  duration: string | null;
  description: string | null;
}

export interface ExamPinProduct {
  id: string;
  name: string;
  category: string;
  price: string;
  costPrice: string | null;
  description: string | null;
  soldCount: number;
}

export interface Payment {
  id: string;
  reference: string;
  amount: string;
  gateway: string;
  status: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export type AirtimeCashStatus =
  | "PENDING"
  | "VERIFYING"
  | "APPROVED"
  | "REJECTED"
  | "FAILED"
  | "CANCELLED";

export interface AirtimeCashRequest {
  id: string;
  reference: string;
  network: string;
  phone: string;
  receivingPhone: string | null;
  amount: string;
  conversionRate: string | null;
  grossCashAmount: string;
  fee: string;
  netAmount: string;
  status: AirtimeCashStatus;
  verificationNotes: string | null;
  verifiedBy: string | null;
  verifiedByName?: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: string | null;
  userEmail?: string | null;
}

export interface AirtimeCashNetworkConfig {
  network: string;
  receivingNumber: string | null;
  conversionRate: number;
  minAmount: number;
  maxAmount: number;
  fee: number;
  enabled: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  status: number;
}

export interface ValidationResult {
  name: string;
  token?: string;
  extra?: Record<string, string>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  volumeByDay: { day: string; successful: string; failed: string; pending: string }[];
  volumeByService: { serviceType: string; total: string; count: number }[];
  recentUsers: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
    createdAt: string;
  }[];
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