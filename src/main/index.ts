import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { getDatabaseService } from './database';
import { registerAllIpcHandlers } from './ipc';
import { logger } from './services/logger.service';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  logger.app('createWindow', 'Creating main application window');
  
  // Create the browser window
  const windowConfig = {
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload/index.js'),
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default' as const,
    icon: path.join(__dirname, '../../assets/icons/icon.png'), // We'll add this later
  };
  
  logger.debug('app', 'Window configuration', windowConfig);
  
  mainWindow = new BrowserWindow(windowConfig);

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    logger.info('app', 'Loading development URL: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
    logger.debug('app', 'DevTools opened for development');
  } else {
    const indexPath = path.join(__dirname, '../../renderer/index.html');
    logger.info('app', 'Loading production file', { path: indexPath });
    mainWindow.loadFile(indexPath);
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      logger.info('app', 'Main window ready and shown to user');
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    logger.info('app', 'Main window closed');
    // Dereference the window object
    mainWindow = null;
  });
  
  // Log web contents events
  mainWindow.webContents.on('did-finish-load', () => {
    logger.debug('app', 'Web contents finished loading');
  });
  
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('app', 'Web contents failed to load', new Error(errorDescription), { errorCode });
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  logger.info('app', 'Electron app ready, starting initialization');
  const startTime = Date.now();
  
  try {
    // Initialize database first
    logger.info('app', 'Initializing database service');
    const dbService = getDatabaseService();
    await dbService.initialize();
    logger.info('app', 'Database service initialized successfully');
    
    // Register IPC handlers
    logger.info('app', 'Registering IPC handlers');
    registerAllIpcHandlers();
    logger.info('app', 'All IPC handlers registered successfully');
    
    // Create the main window
    createWindow();
    
    const initTime = Date.now() - startTime;
    logger.info('app', 'Application initialization completed', { initTimeMs: initTime });
  } catch (error) {
    logger.error('app', 'Failed to initialize application', error instanceof Error ? error : new Error(String(error)));
    app.quit();
  }

  app.on('activate', () => {
    logger.debug('app', 'App activated (macOS dock icon clicked)');
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      logger.info('app', 'No windows open, creating new window');
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', async () => {
  logger.info('app', 'All windows closed');
  
  // Close database connection
  try {
    logger.info('database', 'Closing database connection');
    const dbService = getDatabaseService();
    await dbService.close();
    logger.info('database', 'Database connection closed successfully');
  } catch (error) {
    logger.error('database', 'Error closing database', error instanceof Error ? error : new Error(String(error)));
  }
  
  if (process.platform !== 'darwin') {
    logger.info('app', 'Non-macOS platform, quitting application');
    app.quit();
  } else {
    logger.debug('app', 'macOS platform, keeping app running');
  }
});

// Security: Handle new window creation
app.on('web-contents-created', (_, contents) => {
  logger.debug('app', 'Web contents created, setting security handlers');
  
  // Handle navigation to external URLs
  contents.on('will-navigate', (event, url) => {
    // Allow navigation within the app
    if (url.startsWith('file://')) {
      return;
    }
    
    // Prevent navigation and open in external browser
    event.preventDefault();
    shell.openExternal(url);
    logger.info('app', 'Opening external URL in browser', { url });
  });
  
  // Handle new window requests
  contents.setWindowOpenHandler((details) => {
    // List of trusted domains
    const trustedDomains = [
      'platform.openai.com',
      'openai.com',
      'github.com',
      'docs.openai.com'
    ];
    
    try {
      const url = new URL(details.url);
      
      // Check if the domain is trusted
      if (trustedDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
        // Open in external browser
        shell.openExternal(details.url);
        logger.info('app', 'Opening trusted URL in external browser', { url: details.url });
      } else {
        logger.warn('app', 'Window open request denied for security', { url: details.url });
      }
    } catch (error) {
      logger.error('app', 'Error parsing URL', error as Error, { url: details.url });
    }
    
    // Always deny creating new windows within the app
    return { action: 'deny' };
  });
});

// Log app lifecycle events
app.on('before-quit', () => {
  logger.info('app', 'Application preparing to quit');
});

app.on('will-quit', () => {
  logger.info('app', 'Application will quit');
});

app.on('gpu-process-crashed', (event, killed) => {
  logger.error('app', 'GPU process crashed', new Error('GPU process crashed'), { killed });
});

app.on('render-process-gone', (event, webContents, details) => {
  logger.error('app', 'Renderer process gone', new Error('Renderer process gone'), { reason: details.reason });
});
