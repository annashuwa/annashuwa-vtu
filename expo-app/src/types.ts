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