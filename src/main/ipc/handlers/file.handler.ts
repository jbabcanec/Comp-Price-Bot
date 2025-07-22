import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { IPC_CHANNELS } from '../channels';
import { FileSelectOptions } from '@shared/types/ipc.types';

export function registerFileHandlers(): void {
  // File selection dialog
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async (_, options: FileSelectOptions) => {
    try {
      const result = await dialog.showOpenDialog({
        title: options.title || 'Select File',
        defaultPath: options.defaultPath,
        buttonLabel: options.buttonLabel,
        filters: options.filters || [],
        properties: options.properties || ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, data: null };
      }

      return { success: true, data: result.filePaths[0] };
    } catch (error) {
      console.error('IPC Error - File Select:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'FILE_SELECT_ERROR'
        }
      };
    }
  });

  // File read operation
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8');
      return { success: true, data: content };
    } catch (error) {
      console.error('IPC Error - File Read:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'FILE_READ_ERROR'
        }
      };
    }
  });

  // File write operation
  ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf-8');
      return { success: true, data: true };
    } catch (error) {
      console.error('IPC Error - File Write:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'FILE_WRITE_ERROR'
        }
      };
    }
  });

  console.log('File IPC handlers registered');
}