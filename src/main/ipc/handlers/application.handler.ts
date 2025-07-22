import { ipcMain, app, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../channels';

export function registerApplicationHandlers(): void {
  // Get application version
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, async () => {
    try {
      const version = app.getVersion();
      return { success: true, data: version };
    } catch (error) {
      console.error('IPC Error - App GetVersion:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'APP_GET_VERSION_ERROR'
        }
      };
    }
  });

  // Get application path
  ipcMain.handle(IPC_CHANNELS.APP_GET_PATH, async (_, name: string) => {
    try {
      const path = app.getPath(name as any);
      return { success: true, data: path };
    } catch (error) {
      console.error('IPC Error - App GetPath:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'APP_GET_PATH_ERROR'
        }
      };
    }
  });

  // Restart application
  ipcMain.handle(IPC_CHANNELS.APP_RESTART, async () => {
    try {
      app.relaunch();
      app.exit(0);
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - App Restart:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'APP_RESTART_ERROR'
        }
      };
    }
  });

  // Window control handlers
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.minimize();
      }
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - Window Minimize:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'WINDOW_MINIMIZE_ERROR'
        }
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
        } else {
          focusedWindow.maximize();
        }
      }
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - Window Maximize:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'WINDOW_MAXIMIZE_ERROR'
        }
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.close();
      }
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - Window Close:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'WINDOW_CLOSE_ERROR'
        }
      };
    }
  });

  console.log('Application IPC handlers registered');
}