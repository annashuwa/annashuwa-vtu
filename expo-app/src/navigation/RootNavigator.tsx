import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '../auth/AuthContext';
import { palette } from '../theme';
import { Logo } from '../components/ui';
import type { RootStackParamList, UserTabParamList, AdminTabParamList } from './types';

// Screens
import { LoginScreen } from '../screens/auth/Login';
import { RegisterScreen } from '../screens/auth/Register';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPassword';
import { ResetPasswordScreen } from '../screens/auth/ResetPassword';

import { DashboardScreen } from '../screens/user/Dashboard';
import { WalletScreen } from '../screens/user/Wallet';
import { TransactionsScreen } from '../screens/user/Transactions';
import { ProfileScreen } from '../screens/user/Profile';
import { NotificationsScreen } from '../screens/user/Notifications';
import { BuyAirtimeScreen } from '../screens/user/BuyAirtime';
import { BuyDataScreen } from '../screens/user/BuyData';
import { BuyElectricityScreen } from '../screens/user/BuyElectricity';
import { BuyCableScreen } from '../screens/user/BuyCable';
import { BuyExamPinsScreen } from '../screens/user/BuyExamPins';
import { ResultScreen } from '../screens/user/Result';
import { FundWalletScreen } from '../screens/user/FundWallet';
import { EditProfileScreen } from '../screens/user/EditProfile';
import { ChangePasswordScreen } from '../screens/user/ChangePassword';
import { TransactionDetailScreen } from '../screens/user/TransactionDetail';

import { AdminHomeScreen } from '../screens/admin/AdminHome';
import { AdminUsersScreen } from '../screens/admin/AdminUsers';
import { AdminTransactionsScreen } from '../screens/admin/AdminTransactions';
import { AdminServicesScreen } from '../screens/admin/AdminServices';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const UserTabs = createBottomTabNavigator<UserTabParamList>();
const AdminTabs = createBottomTabNavigator<AdminTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: palette.primary,
    background: palette.background,
    card: palette.card,
    text: palette.text,
    border: palette.border,
  },
};

function SplashView() {
  return (
    <View style={styles.splash}>
      <Logo size={72} />
      <Text style={styles.splashText}>ANNASHUWA VTU</Text>
      <Text style={styles.splashSub}>Recharge. Pay. Go.</Text>
    </View>
  );
}

function tabIcon(route: string, focused: boolean) {
  const map: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
    HomeTab: ['home-outline', 'home'],
    WalletTab: ['wallet-outline', 'wallet'],
    ActivityTab: ['receipt-outline', 'receipt'],
    MoreTab: ['person-circle-outline', 'person-circle'],
    AdminHomeTab: ['stats-chart-outline', 'stats-chart'],
    AdminUsersTab: ['people-outline', 'people'],
    AdminTransactionsTab: ['swap-horizontal-outline', 'swap-horizontal'],
    AdminServicesTab: ['grid-outline', 'grid'],
  };
  const [off, on] = map[route] ?? ['ellipse-outline', 'ellipse'];
  return <Ionicons name={focused ? on : off} size={22} color={focused ? palette.primary : '#9CA3AF'} />;
}

export function RootNavigator() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <>
        <StatusBar style="light" />
        <SplashView />
      </>
    );
  }

  const isAdmin = user?.role === 'ADMIN';

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {status !== 'authed' ? (
          <RootStack.Group>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </RootStack.Group>
        ) : (
          <RootStack.Group>
            <RootStack.Screen name="Main" component={isAdmin ? AdminTabsNavigator : UserTabsNavigator} />
            <RootStack.Screen name="BuyAirtime" component={BuyAirtimeScreen} />
            <RootStack.Screen name="BuyData" component={BuyDataScreen} />
            <RootStack.Screen name="BuyElectricity" component={BuyElectricityScreen} />
            <RootStack.Screen name="BuyCable" component={BuyCableScreen} />
            <RootStack.Screen name="BuyExamPins" component={BuyExamPinsScreen} />
            <RootStack.Screen name="Result" component={ResultScreen} options={{ gestureEnabled: false }} />
            <RootStack.Screen name="FundWallet" component={FundWalletScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} />
            <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
            <RootStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <RootStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
          </RootStack.Group>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

function UserTabsNavigator() {
  return (
    <UserTabs.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => tabIcon(route.name, focused),
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.border },
        tabBarLabelStyle: { fontWeight: '600' },
        headerShown: false,
      })}
    >
      <UserTabs.Screen name="HomeTab" component={DashboardScreen} options={{ title: 'Home' }} />
      <UserTabs.Screen name="WalletTab" component={WalletScreen} options={{ title: 'Wallet' }} />
      <UserTabs.Screen name="ActivityTab" component={TransactionsScreen} options={{ title: 'Activity' }} />
      <UserTabs.Screen name="MoreTab" component={ProfileScreen} options={{ title: 'More' }} />
    </UserTabs.Navigator>
  );
}

function AdminTabsNavigator() {
  return (
    <AdminTabs.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => tabIcon(route.name, focused),
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.border },
        tabBarLabelStyle: { fontWeight: '600' },
        headerShown: false,
      })}
    >
      <AdminTabs.Screen name="AdminHomeTab" component={AdminHomeScreen} options={{ title: 'Overview' }} />
      <AdminTabs.Screen name="AdminUsersTab" component={AdminUsersScreen} options={{ title: 'Users' }} />
      <AdminTabs.Screen name="AdminTransactionsTab" component={AdminTransactionsScreen} options={{ title: 'Transactions' }} />
      <AdminTabs.Screen name="AdminServicesTab" component={AdminServicesScreen} options={{ title: 'Services' }} />
    </AdminTabs.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.darkGreen },
  splashText: { marginTop: 16, color: '#FFFFFF', fontWeight: '800', fontSize: 20, letterSpacing: 1 },
  splashSub: { marginTop: 4, color: '#B7E5CB', fontSize: 13 },
});