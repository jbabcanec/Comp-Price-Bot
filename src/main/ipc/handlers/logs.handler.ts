import { ipcMain } from 'electron';
import { logger } from '../../services/logger.service';
import * as fs from 'fs';

/**
 * IPC handlers for log management and debugging
 */
export function setupLogsHandlers(): void {
  // Get recent log entries
  ipcMain.handle('logs:get-recent', async (_, count = 100, category?: string) => {
    try {
      const logs = logger.getRecentLogs(count, category);
      return { success: true, logs };
    } catch (error) {
      logger.error('logs', 'Failed to get recent logs', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get logs'
      };
    }
  });

  // Get log file paths
  ipcMain.handle('logs:get-files', async () => {
    try {
      const files = logger.getLogFiles();
      return { success: true, files };
    } catch (error) {
      logger.error('logs', 'Failed to get log files', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get log files'
      };
    }
  });

  // Export logs to file
  ipcMain.handle('logs:export', async (_, outputPath: string) => {
    try {
      const success = logger.exportLogs(outputPath);
      return { success };
    } catch (error) {
      logger.error('logs', 'Failed to export logs', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export logs'
      };
    }
  });

  // Read specific log file content
  ipcMain.handle('logs:read-file', async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Log file not found' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.trim().split('\n');
      const entries = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);

      return { success: true, entries, lineCount: lines.length };
    } catch (error) {
      logger.error('logs', 'Failed to read log file', error instanceof Error ? error : new Error(String(error)), { filePath });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read log file'
      };
    }
  });

  // Clear logs (for testing)
  ipcMain.handle('logs:clear', async () => {
    try {
      const logFiles = logger.getLogFiles();
      let deletedCount = 0;

      for (const logFile of logFiles) {
        try {
          fs.unlinkSync(logFile);
          deletedCount++;
        } catch (error) {
          logger.warn('logs', `Failed to delete log file: ${logFile}`, error instanceof Error ? error : new Error(String(error)));
        }
      }

      logger.info('logs', `Cleared ${deletedCount} log files`);
      return { success: true, deletedCount };
    } catch (error) {
      logger.error('logs', 'Failed to clear logs', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear logs'
      };
    }
  });

  // Test logging functionality
  ipcMain.handle('logs:test', async () => {
    try {
      logger.debug('logs', 'Test debug message', { testData: 'debug' });
      logger.info('logs', 'Test info message', { testData: 'info' });
      logger.warn('logs', 'Test warning message', { testData: 'warning' });
      logger.error('logs', 'Test error message', new Error('Test error'), { testData: 'error' });
      logger.info('api-key', 'Test API key operation', { testData: 'api-key-test' });
      logger.fileOperation('test', '/test/file.txt', true, 'Test file operation');
      logger.database('test', 'test_table', true, 'Test database operation');
      logger.network('GET', 'https://example.com/test', 200, 150);
      logger.app('test', 'Test application event');

      return { success: true, message: 'All test log messages generated' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test logging failed'
      };
    }
  });

  logger.info('logs', 'Log management IPC handlers registered');
}