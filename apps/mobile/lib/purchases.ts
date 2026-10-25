import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type * as PurchasesNS from 'react-native-purchases';

/**
 * RevenueCat (abonnements iOS/Android). Les clés publiques viennent de app.json → extra.revenuecat.
 * Sans clé, l'écran Premium explique que l'achat mobile n'est pas encore configuré : jamais de faux achat.
 * Le module natif n'existe pas dans Expo Go : chargement dynamique et repli propre.
 */
const keys = (Constants.expoConfig?.extra as { revenuecat?: { ios?: string; android?: string } } | undefined)?.revenuecat ?? {};
export const purchasesConfigured = !!(Platform.OS === 'ios' ? keys.ios : keys.android);

type PurchasesModule = typeof PurchasesNS;
let mod: PurchasesModule | null = null;
async function load(): Promise<PurchasesModule | null> {
  if (!purchasesConfigured) return null;
  if (!mod) {
    try {
      mod = await import('react-native-purchases');
    } catch {
      return null;
    }
  }
  return mod;
}

export async function configurePurchases(userId: string): Promise<void> {
  const Purchases = (await load())?.default;
  if (!Purchases) return;
  const apiKey = Platform.OS === 'ios' ? keys.ios! : keys.android!;
  Purchases.configure({ apiKey, appUserID: userId });
}

export interface Offer {
  identifier: string;
  title: string;
  priceString: string;
  period: 'MONTH' | 'YEAR' | 'OTHER';
  purchase: () => Promise<boolean>;
}

export async function loadOffers(): Promise<Offer[]> {
  const Purchases = (await load())?.default;
  if (!Purchases) return [];
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  return current.availablePackages.map((p) => ({
    identifier: p.identifier,
    title: p.product.title,
    priceString: p.product.priceString,
    period: p.packageType === 'ANNUAL' ? 'YEAR' : p.packageType === 'MONTHLY' ? 'MONTH' : 'OTHER',
    purchase: async () => {
      try {
        const { customerInfo } = await Purchases.purchasePackage(p);
        return Object.keys(customerInfo.entitlements.active).length > 0;
      } catch (e) {
        if ((e as { userCancelled?: boolean }).userCancelled) return false;
        throw e;
      }
    },
  }));
}

export async function restorePurchases(): Promise<boolean> {
  const Purchases = (await load())?.default;
  if (!Purchases) return false;
  const info = await Purchases.restorePurchases();
  return Object.keys(info.entitlements.active).length > 0;
}

export async function logoutPurchases(): Promise<void> {
  const Purchases = (await load())?.default;
  if (!Purchases) return;
  try {
    await Purchases.logOut();
  } catch {
    /* non connecté */
  }
}
