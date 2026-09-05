import type { NavigatorScreenParams } from '@react-navigation/native';
import type { PurchaseResult, TxnItem, TxnStatus } from '../types';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { devToken?: string } | undefined;
  Main: NavigatorScreenParams<UserTabParamList> | NavigatorScreenParams<AdminTabParamList> | undefined;
  BuyAirtime: undefined;
  BuyData: undefined;
  BuyElectricity: undefined;
  BuyCable: undefined;
  BuyExamPins: undefined;
  Result: {
    title: string;
    status: TxnStatus;
    message: string;
    reference: string;
    amount: string;
    serviceType: string;
    customerInfo?: string;
    provider?: string;
    purchase?: PurchaseResult;
  };
  FundWallet: undefined;
  Notifications: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  TransactionDetail: { id: string; item?: TxnItem; purchased?: PurchaseResult };
};

export type UserTabParamList = {
  HomeTab: undefined;
  WalletTab: undefined;
  ActivityTab: undefined;
  MoreTab: undefined;
};

export type AdminTabParamList = {
  AdminHomeTab: undefined;
  AdminUsersTab: undefined;
  AdminTransactionsTab: undefined;
  AdminServicesTab: undefined;
};