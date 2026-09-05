export const APP_NAME = "ANNASHUWA VTU";
export const APP_TAGLINE = "Recharge. Pay. Go.";

export const NETWORKS = [
  { name: "MTN", code: "MTN", color: "#FFCC00", textColor: "#0B1220" },
  { name: "Airtel", code: "Airtel", color: "#ED1C24", textColor: "#FFFFFF" },
  { name: "Glo", code: "Glo", color: "#00B140", textColor: "#FFFFFF" },
  { name: "9mobile", code: "9mobile", color: "#00AEEF", textColor: "#FFFFFF" },
] as const;

export const NETWORK_CODES = ["MTN", "Airtel", "Glo", "9mobile"] as const;
export type NetworkCode = (typeof NETWORK_CODES)[number];

export const EXAM_CATEGORIES = ["WAEC", "NECO", "NABTEB", "JAMB"] as const;

export const SERVICE_TYPES = [
  { value: "AIRTIME", label: "Airtime" },
  { value: "DATA", label: "Data" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "CABLE", label: "Cable TV" },
  { value: "EXAM_PIN", label: "Exam PIN" },
  { value: "WALLET_FUNDING", label: "Wallet Funding" },
] as const;

export const TXN_STATUS = ["PENDING", "PROCESSING", "SUCCESSFUL", "FAILED"] as const;

export const serviceLabels: Record<string, string> = {
  AIRTIME: "Airtime",
  DATA: "Data",
  ELECTRICITY: "Electricity",
  CABLE: "Cable TV",
  EXAM_PIN: "Exam PIN",
  WALLET_FUNDING: "Wallet funding",
  WITHDRAWAL: "Withdrawal",
};

export function getProviderName(code: string): string {
  if (NETWORK_CODES.includes(code as NetworkCode)) return code;
  return code;
}

export const MOCK_MODE = process.env.MOCK_MODE === "true";
export const PAYMENT_MODE = process.env.PAYMENT_MODE === "live" ? "live" : "test";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
  airtime: "/airtime",
  airtimeCash: "/airtime-cash",
  data: "/data",
  electricity: "/electricity",
  cable: "/cable",
  examPins: "/exam-pins",
  wallet: "/wallet",
  transactions: "/transactions",
  profile: "/profile",
  admin: "/admin",
  adminUsers: "/admin/users",
  adminTransactions: "/admin/transactions",
  adminServices: "/admin/services",
  adminAirtimeCash: "/admin/airtime-cash",
};

export const AIRTIME_CASH_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending verification",
  VERIFYING: "Verifying",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const DEMO_CREDENTIALS = {
  admin: { email: "admin@annashuwa.com", password: "Admin@1234" },
  user: { email: "user@annashuwa.com", password: "User@1234" },
};

/**
 * Best-effort network detection from a Nigerian mobile number prefix.
 *   MTN: 0703, 0706, 0803, 0806, 0810, 0813, 0814, 0816, 0903, 0906, 0913, 0916
 *   Airtel: 0701, 0708, 0802, 0808, 0812, 0901, 0902, 0904, 0907, 0912, 0905
 *   Glo: 0705, 0805, 0807, 0811, 0815, 0905, 0915, 0916
 *   9mobile: 0809, 0817, 0818, 0908, 0909, 0910
 */
export function detectNetwork(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  const prefix = digits.slice(-10, -7);
  const map: Record<string, string> = {
    "703": "MTN", "706": "MTN", "803": "MTN", "806": "MTN",
    "810": "MTN", "813": "MTN", "814": "MTN", "816": "MTN",
    "903": "MTN", "906": "MTN", "913": "MTN", "916": "MTN",
    "701": "Airtel", "708": "Airtel", "802": "Airtel", "808": "Airtel",
    "812": "Airtel", "901": "Airtel", "902": "Airtel", "904": "Airtel",
    "705": "Glo", "805": "Glo", "807": "Glo", "811": "Glo",
    "815": "Glo", "905": "Glo", "915": "Glo", "929": "Glo",
    "809": "9mobile", "817": "9mobile", "818": "9mobile",
    "908": "9mobile", "909": "9mobile", "910": "9mobile",
  };
  return map[prefix] ?? null;
}