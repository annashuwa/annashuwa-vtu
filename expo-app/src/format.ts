// Formatting helpers for money & dates (money is string-typed from the API).

export function fmtMoney(value: number | string, opts?: { currency?: boolean }): string {
  const num = typeof value === 'string' ? Number(value) : value;
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  const nf = abs.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${opts?.currency === false ? '' : '₦'}${nf}`;
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const sec = Math.floor((Date.now() - then) / 1000);
  const ranges: [number, string][] = [
    [60, 's'],
    [60, 'm'],
    [24, 'h'],
    [30, 'd'],
    [12, 'mo'],
  ];
  let value = sec;
  let unit = 's';
  let acc = 1;
  for (let i = 0; i < ranges.length; i++) {
    if (value < ranges[i][0]) {
      unit = ranges[i][1];
      break;
    }
    value = Math.floor(value / ranges[i][0]);
    acc = ranges[i][0];
    unit = ranges[i][1];
  }
  void acc;
  return `${value}${unit} ago`;
}

export const serviceLabels: Record<string, string> = {
  AIRTIME: 'Airtime',
  DATA: 'Data',
  ELECTRICITY: 'Electricity',
  CABLE: 'Cable TV',
  EXAM_PIN: 'Exam PIN',
  WALLET_FUNDING: 'Wallet funding',
  WITHDRAWAL: 'Withdrawal',
};

export function detectNetwork(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, '');
  if (digits.length < 10) return null;
  const prefix = digits.slice(-10, -7);
  const map: Record<string, string> = {
    '703': 'MTN', '706': 'MTN', '803': 'MTN', '806': 'MTN', '810': 'MTN',
    '813': 'MTN', '814': 'MTN', '816': 'MTN', '903': 'MTN', '906': 'MTN',
    '913': 'MTN', '916': 'MTN',
    '701': 'Airtel', '708': 'Airtel', '802': 'Airtel', '808': 'Airtel',
    '812': 'Airtel', '901': 'Airtel', '902': 'Airtel', '904': 'Airtel',
    '705': 'Glo', '805': 'Glo', '807': 'Glo', '811': 'Glo', '815': 'Glo',
    '905': 'Glo', '915': 'Glo', '929': 'Glo',
    '809': '9mobile', '817': '9mobile', '818': '9mobile', '908': '9mobile',
    '909': '9mobile', '910': '9mobile',
  };
  return map[prefix] ?? null;
}