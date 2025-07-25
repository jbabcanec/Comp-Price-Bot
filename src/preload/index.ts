import { contextBridge, ipcRenderer } from 'electron';
import { IpcResponse, FileSelectOptions } from '@shared/types/ipc.types';

// Define the API that will be exposed to the renderer process
export interface ElectronAPI {
  // Window operations
  window: {
    minimize: () => Promise<IpcResponse<boolean>>;
    maximize: () => Promise<IpcResponse<boolean>>;
    close: () => Promise<IpcResponse<boolean>>;
  };

  // File operations
  file: {
    select: (options: FileSelectOptions) => Promise<IpcResponse<string | null>>;
    read: (filePath: string) => Promise<IpcResponse<string>>;
    write: (filePath: string, content: string) => Promise<IpcResponse<boolean>>;
    process: (filePath: string) => Promise<IpcResponse<any>>;
    scanDirectory: (directoryPath: string) => Promise<IpcResponse<any[]>>;
    processBatch: (filePaths: string[]) => Promise<IpcResponse<any[]>>;
    validateProducts: (extractedData: any[]) => Promise<IpcResponse<any>>;
  };

  // Database operations - Products
  database: {
    products: {
      create: (product: any) => Promise<IpcResponse<any>>;
      findAll: (filters?: any) => Promise<IpcResponse<any[]>>;
      findById: (id: number) => Promise<IpcResponse<any | null>>;
      update: (product: any) => Promise<IpcResponse<any>>;
      delete: (id: number) => Promise<IpcResponse<boolean>>;
      bulkCreate: (products: any[]) => Promise<IpcResponse<number>>;
    };
    mappings: {
      create: (mapping: any) => Promise<IpcResponse<any>>;
      findAll: (filters?: any) => Promise<IpcResponse<any[]>>;
      findById: (id: number) => Promise<IpcResponse<any | null>>;
      update: (mapping: any) => Promise<IpcResponse<any>>;
      delete: (id: number) => Promise<IpcResponse<boolean>>;
      verify: (id: number, verifiedBy: string) => Promise<IpcResponse<any>>;
      getStats: () => Promise<IpcResponse<any>>;
    };
  };

  // Settings operations
  settings: {
    get: (key: string) => Promise<IpcResponse<any>>;
    set: (key: string, value: any) => Promise<IpcResponse<boolean>>;
    getAll: () => Promise<IpcResponse<Record<string, any>>>;
    reset: () => Promise<IpcResponse<boolean>>;
  };

  // API Key operations
  apiKey: {
    storeOpenAI: (apiKey: string) => Promise<IpcResponse<boolean>>;
    getOpenAI: () => Promise<IpcResponse<string | null>>;
    hasOpenAI: () => Promise<boolean>;
    getMetadata: () => Promise<{ hasKey: boolean; timestamp?: string; masked?: string }>;
    removeOpenAI: () => Promise<IpcResponse<boolean>>;
    validateOpenAI: (apiKey?: string) => Promise<{ valid: boolean; error?: string }>;
    getUsage: () => Promise<IpcResponse<{ requests: number; tokens: number; lastReset: string } | null>>;
    isSecureStorageAvailable: () => Promise<boolean>;
  };

  // History operations
  history: {
    getAll: (limit?: number, offset?: number) => Promise<IpcResponse<any[]>>;
    getByCompany: (company: string) => Promise<IpcResponse<any[]>>;
    getAnalytics: () => Promise<IpcResponse<any>>;
    create: (record: any) => Promise<IpcResponse<{ id: number }>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
    getStatsByDate: (startDate: string, endDate: string) => Promise<IpcResponse<any>>;
    exportCsv: () => Promise<IpcResponse<string>>;
  };

  // Application operations
  app: {
    getVersion: () => Promise<IpcResponse<string>>;
    getPath: (name: string) => Promise<IpcResponse<string>>;
    restart: () => Promise<IpcResponse<boolean>>;
  };

  // External operations
  external: {
    openUrl: (url: string) => Promise<IpcResponse<boolean>>;
  };
}

// Create the API object
const electronAPI: ElectronAPI = {
  // Window operations
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // File operations
  file: {
    select: (options: FileSelectOptions) => ipcRenderer.invoke('file:select', options),
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    process: (filePath: string) => ipcRenderer.invoke('file:process', filePath),
    scanDirectory: (directoryPath: string) => ipcRenderer.invoke('file:scanDirectory', directoryPath),
    processBatch: (filePaths: string[]) => ipcRenderer.invoke('file:processBatch', filePaths),
    validateProducts: (extractedData: any[]) => ipcRenderer.invoke('file:validateProducts', extractedData),
  },

  // Database operations
  database: {
    products: {
      create: (product: any) => ipcRenderer.invoke('db:products:create', product),
      findAll: (filters?: any) => ipcRenderer.invoke('db:products:findAll', filters),
      findById: (id: number) => ipcRenderer.invoke('db:products:findById', id),
      update: (product: any) => ipcRenderer.invoke('db:products:update', product),
      delete: (id: number) => ipcRenderer.invoke('db:products:delete', id),
      bulkCreate: (products: any[]) => ipcRenderer.invoke('db:products:bulkCreate', products),
    },
    mappings: {
      create: (mapping: any) => ipcRenderer.invoke('db:mappings:create', mapping),
      findAll: (filters?: any) => ipcRenderer.invoke('db:mappings:findAll', filters),
      findById: (id: number) => ipcRenderer.invoke('db:mappings:findById', id),
      update: (mapping: any) => ipcRenderer.invoke('db:mappings:update', mapping),
      delete: (id: number) => ipcRenderer.invoke('db:mappings:delete', id),
      verify: (id: number, verifiedBy: string) => ipcRenderer.invoke('db:mappings:verify', id, verifiedBy),
      getStats: () => ipcRenderer.invoke('db:mappings:getStats'),
    },
  },

  // Settings operations
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  // API Key operations
  apiKey: {
    storeOpenAI: (apiKey: string) => ipcRenderer.invoke('api-key:store-openai', apiKey),
    getOpenAI: () => ipcRenderer.invoke('api-key:get-openai'),
    hasOpenAI: () => ipcRenderer.invoke('api-key:has-openai'),
    getMetadata: () => ipcRenderer.invoke('api-key:get-metadata'),
    removeOpenAI: () => ipcRenderer.invoke('api-key:remove-openai'),
    validateOpenAI: (apiKey?: string) => ipcRenderer.invoke('api-key:validate-openai', apiKey),
    getUsage: () => ipcRenderer.invoke('api-key:get-usage'),
    isSecureStorageAvailable: () => ipcRenderer.invoke('api-key:secure-storage-available'),
  },

  // History operations
  history: {
    getAll: (limit?: number, offset?: number) => ipcRenderer.invoke('history:getAll', limit, offset),
    getByCompany: (company: string) => ipcRenderer.invoke('history:getByCompany', company),
    getAnalytics: () => ipcRenderer.invoke('history:getAnalytics'),
    create: (record: any) => ipcRenderer.invoke('history:create', record),
    delete: (id: number) => ipcRenderer.invoke('history:delete', id),
    getStatsByDate: (startDate: string, endDate: string) => ipcRenderer.invoke('history:getStatsByDate', startDate, endDate),
    exportCsv: () => ipcRenderer.invoke('history:exportCsv'),
  },

  // Application operations
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    restart: () => ipcRenderer.invoke('app:restart'),
  },

  // External operations
  external: {
    openUrl: (url: string) => ipcRenderer.invoke('external:open-url', url),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
