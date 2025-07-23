import { ipcMain } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS } from '../channels';
import { DatabaseConnection } from '../../database/connection';

// Initialize electron-store for settings
const store = new Store({
  name: 'hvac-crosswalk-settings',
  defaults: {
    openAIApiKey: '',
    defaultCompany: '',
    autoProcessing: false,
    matchThreshold: 0.8,
    databaseLocation: '',
    theme: 'light'
  }
});

export function registerSettingsHandlers(): void {
  // Get single setting
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (_, key: string) => {
    try {
      const value = store.get(key);
      return { success: true, data: value };
    } catch (error) {
      console.error('IPC Error - Settings Get:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SETTINGS_GET_ERROR'
        }
      };
    }
  });

  // Set single setting
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_, key: string, value: any) => {
    try {
      store.set(key, value);
      
      // Handle database location change
      if (key === 'databaseLocation') {
        // Note: In a real implementation, you'd need to get the database instance
        // and call setDatabasePath(value). For now, we'll just store the setting.
        // The actual database location change would happen on next app restart
        // or when the database service is reinitialized.
        console.log('Database location updated to:', value || '[Default]');
      }
      
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - Settings Set:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SETTINGS_SET_ERROR'
        }
      };
    }
  });

  // Get all settings
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, async () => {
    try {
      const allSettings = store.store;
      return { success: true, data: allSettings };
    } catch (error) {
      console.error('IPC Error - Settings GetAll:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SETTINGS_GET_ALL_ERROR'
        }
      };
    }
  });

  // Reset settings to defaults
  ipcMain.handle(IPC_CHANNELS.SETTINGS_RESET, async () => {
    try {
      store.clear();
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - Settings Reset:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'SETTINGS_RESET_ERROR'
        }
      };
    }
  });

  console.log('Settings IPC handlers registered');
}