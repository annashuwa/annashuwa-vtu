import type { IUser } from "../models/user";
import type { IWallet } from "../models/wallet";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: string; name: string; email: string } | null;
      authUser?: IUser | null;
      authWallet?: IWallet | null;
    }
  }
}

export {};