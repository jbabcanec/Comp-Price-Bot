import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { getDatabaseService } from './database';
import { registerAllIpcHandlers } from './ipc';

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  // Create the browser window
  mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../../assets/icons/icon.png'), // We'll add this later
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    mainWindow = null;
  });
};

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  try {
    // Initialize database first
    console.log('Initializing database...');
    const dbService = getDatabaseService();
    await dbService.initialize();
    
    // Register IPC handlers
    console.log('Registering IPC handlers...');
    registerAllIpcHandlers();
    
    // Create the main window
    createWindow();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', async () => {
  // Close database connection
  try {
    const dbService = getDatabaseService();
    await dbService.close();
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
