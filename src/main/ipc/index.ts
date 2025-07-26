import { registerDatabaseHandlers } from './handlers/database.handler';
import { registerFileHandlers } from './handlers/file.handler';
import { registerSettingsHandlers } from './handlers/settings.handler';
import { registerApplicationHandlers } from './handlers/application.handler';
import { setupApiKeyHandlers } from './handlers/apiKey.handler';
import { registerHistoryHandlers } from './handlers/history.handler';
import { setupLogsHandlers } from './handlers/logs.handler';
import { registerExternalHandlers } from './handlers/external.handler';
import { registerCrosswalkHandlers } from './handlers/crosswalk.handler';

/**
 * Register all IPC handlers for the application
 * This should be called once during app initialization
 */
export function registerAllIpcHandlers(): void {
  console.log('Registering IPC handlers...');
  
  // Register all handler modules
  registerDatabaseHandlers();
  registerFileHandlers();
  registerSettingsHandlers();
  registerApplicationHandlers();
  setupApiKeyHandlers();
  registerHistoryHandlers();
  setupLogsHandlers();
  registerExternalHandlers();
  registerCrosswalkHandlers();
  
  console.log('All IPC handlers registered successfully');
}