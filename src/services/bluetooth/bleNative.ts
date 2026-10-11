import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

let initialized = false;

/**
 * Initializes the Capacitor Native Bluetooth LE plugin and requests Android permissions.
 * Safe to call multiple times.
 */
export async function ensureNativeBleReady(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;

  await BleClient.initialize();
  initialized = true;
}
