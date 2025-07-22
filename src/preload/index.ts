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

  // Application operations
  app: {
    getVersion: () => Promise<IpcResponse<string>>;
    getPath: (name: string) => Promise<IpcResponse<string>>;
    restart: () => Promise<IpcResponse<boolean>>;
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

  // Application operations
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name: string) => ipcRenderer.invoke('app:getPath', name),
    restart: () => ipcRenderer.invoke('app:restart'),
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
