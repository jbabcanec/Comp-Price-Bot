/**
 * Auto-Updater Service for Production Releases
 * Handles automatic updates from GitHub releases
 */

import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { logger } from './logger.service';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private isUpdateAvailable = false;

  constructor(mainWindow?: BrowserWindow) {
    this.mainWindow = mainWindow || null;
    this.setupAutoUpdater();
  }

  private setupAutoUpdater(): void {
    // Configure auto-updater
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.autoDownload = false; // Don't auto-download
    autoUpdater.autoInstallOnAppQuit = true;

    // Set up event listeners
    autoUpdater.on('checking-for-update', () => {
      logger.info('auto-updater', 'Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      logger.info('auto-updater', 'Update available', { version: info.version });
      this.isUpdateAvailable = true;
      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      logger.info('auto-updater', 'Update not available', { version: info.version });
      this.isUpdateAvailable = false;
    });

    autoUpdater.on('error', (err) => {
      logger.error('auto-updater', 'Auto-updater error', err);
      this.isUpdateAvailable = false;
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      logger.info('auto-updater', `Download progress: ${percent}%`);
      
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(progressObj.percent / 100);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('auto-updater', 'Update downloaded', { version: info.version });
      
      if (this.mainWindow) {
        this.mainWindow.setProgressBar(-1); // Remove progress bar
      }
      
      this.showUpdateReadyDialog(info);
    });
  }

  /**
   * Check for updates manually
   */
  public async checkForUpdates(): Promise<void> {
    try {
      logger.info('auto-updater', 'Manual update check initiated');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.error('auto-updater', 'Manual update check failed', error as Error);
      
      if (this.mainWindow) {
        dialog.showErrorBox(
          'Update Check Failed',
          'Failed to check for updates. Please check your internet connection and try again.'
        );
      }
    }
  }

  /**
   * Download available update
   */
  public async downloadUpdate(): Promise<void> {
    if (!this.isUpdateAvailable) {
      logger.warn('auto-updater', 'No update available to download');
      return;
    }

    try {
      logger.info('auto-updater', 'Starting update download');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      logger.error('auto-updater', 'Update download failed', error as Error);
      
      if (this.mainWindow) {
        dialog.showErrorBox(
          'Download Failed',
          'Failed to download the update. Please try again later.'
        );
      }
    }
  }

  /**
   * Install downloaded update and restart
   */
  public quitAndInstall(): void {
    logger.info('auto-updater', 'Installing update and restarting');
    autoUpdater.quitAndInstall();
  }

  /**
   * Show dialog when update is available
   */
  private async showUpdateAvailableDialog(info: any): Promise<void> {
    if (!this.mainWindow) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      detail: 'Would you like to download and install it now?',
      buttons: ['Download Now', 'Download Later', 'Skip This Version'],
      defaultId: 0,
      cancelId: 2
    });

    switch (response.response) {
      case 0: // Download Now
        await this.downloadUpdate();
        break;
      case 1: // Download Later
        logger.info('auto-updater', 'User chose to download update later');
        break;
      case 2: // Skip This Version
        logger.info('auto-updater', 'User chose to skip this version');
        break;
    }
  }

  /**
   * Show dialog when update is ready to install
   */
  private async showUpdateReadyDialog(info: any): Promise<void> {
    if (!this.mainWindow) return;

    const response = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Update to version ${info.version} has been downloaded.`,
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Restart Later'],
      defaultId: 0,
      cancelId: 1
    });

    if (response.response === 0) {
      this.quitAndInstall();
    } else {
      logger.info('auto-updater', 'User chose to restart later');
    }
  }

  /**
   * Get current update status
   */
  public getUpdateStatus(): {
    isUpdateAvailable: boolean;
    currentVersion: string;
  } {
    return {
      isUpdateAvailable: this.isUpdateAvailable,
      currentVersion: require('../../../package.json').version
    };
  }
}

// Singleton instance
let autoUpdaterService: AutoUpdaterService | null = null;

export function initializeAutoUpdater(mainWindow?: BrowserWindow): AutoUpdaterService {
  if (!autoUpdaterService) {
    autoUpdaterService = new AutoUpdaterService(mainWindow);
  }
  return autoUpdaterService;
}

export function getAutoUpdaterService(): AutoUpdaterService | null {
  return autoUpdaterService;
}