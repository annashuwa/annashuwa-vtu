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