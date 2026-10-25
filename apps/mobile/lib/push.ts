import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Demande la permission (une fois), récupère le jeton Expo et l'enregistre côté API.
 * Silencieux en cas de refus : l'utilisateur garde les notifications in-app.
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Entre Nous', importance: Notifications.AndroidImportance.DEFAULT, sound: 'default' });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
  await api.post('/push/devices', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android', deviceName: Device.modelName ?? undefined }).catch(() => undefined);
  return token;
}

export async function unregisterPush(): Promise<void> {
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await api.delete('/push/devices', { token });
  } catch {
    /* pas de jeton : rien à retirer */
  }
}
