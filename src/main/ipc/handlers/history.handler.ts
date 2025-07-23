import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../channels';
import { getDatabase } from '../../database/connection';
import { HistoryRepository, ProcessingHistoryRecord } from '../../database/repositories/history.repo';

let historyRepo: HistoryRepository;

export function registerHistoryHandlers(): void {
  // Initialize repository
  const db = getDatabase();
  historyRepo = new HistoryRepository(db);

  // Get all processing history
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ALL, async (_, limit: number = 100, offset: number = 0) => {
    try {
      const history = await historyRepo.getAllHistory(limit, offset);
      return { success: true, data: history };
    } catch (error) {
      console.error('IPC Error - History GetAll:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HISTORY_GET_ALL_ERROR'
        }
      };
    }
  });

  // Get history by company
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_BY_COMPANY, async (_, company: string) => {
    try {
      const history = await historyRepo.getHistoryByCompany(company);
      return { success: true, data: history };
    } catch (error) {
      console.error('IPC Error - History GetByCompany:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HISTORY_GET_BY_COMPANY_ERROR'
        }
      };
    }
  });

  // Get analytics data
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_ANALYTICS, async () => {
    try {
      const analytics = await historyRepo.getAnalytics();
      return { success: true, data: analytics };
    } catch (error) {
      console.error('IPC Error - History GetAnalytics:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HISTORY_GET_ANALYTICS_ERROR'
        }
      };
    }
  });

  // Create new history record
  ipcMain.handle(IPC_CHANNELS.HISTORY_CREATE, async (_, record: Omit<ProcessingHistoryRecord, 'id' | 'processedAt'>) => {
    try {
      const id = await historyRepo.createHistoryRecord(record);
      return { success: true, data: { id } };
    } catch (error) {
      console.error('IPC Error - History Create:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HISTORY_CREATE_ERROR'
        }
      };
    }
  });

  // Delete history record
  ipcMain.handle(IPC_CHANNELS.HISTORY_DELETE, async (_, id: number) => {
    try {
      await historyRepo.deleteHistoryRecord(id);
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - History Delete:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HISTORY_DELETE_ERROR'
        }
      };
    }
  });

  // Get history stats by date range
  ipcMain.handle(IPC_CHANNELS.HISTORY_GET_STATS_BY_DATE, async (_, startDate: string, endDate: string) => {
    try {
      const stats = await historyRepo.getHistoryStatsByDateRange(startDate, endDate);
      return { success: true, data: stats };
    } catch (error) {
      console.error('IPC Error - History GetStatsByDate:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HISTORY_GET_STATS_BY_DATE_ERROR'
        }
      };
    }
  });

  // Export history to CSV
  ipcMain.handle(IPC_CHANNELS.HISTORY_EXPORT_CSV, async () => {
    try {
      const csvData = await historyRepo.exportHistoryToCsv();
      return { success: true, data: csvData };
    } catch (error) {
      console.error('IPC Error - History ExportCSV:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'HISTORY_EXPORT_CSV_ERROR'
        }
      };
    }
  });

  console.log('History IPC handlers registered');
}