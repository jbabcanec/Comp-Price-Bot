// IPC channel definitions and types

export interface IpcChannels {
  // Window operations
  'window:minimize': () => void;
  'window:maximize': () => void;
  'window:close': () => void;
  
  // File operations
  'file:select': (options: FileSelectOptions) => string | null;
  'file:read': (filePath: string) => string;
  'file:write': (filePath: string, content: string) => void;
  
  // Database operations
  'db:products:create': (product: any) => any;
  'db:products:findAll': (filters?: any) => any[];
  'db:products:findById': (id: number) => any | null;
  'db:products:update': (product: any) => any;
  'db:products:delete': (id: number) => boolean;
  'db:products:bulkCreate': (products: any[]) => number;
  
  'db:mappings:create': (mapping: any) => any;
  'db:mappings:findAll': (filters?: any) => any[];
  'db:mappings:findById': (id: number) => any | null;
  'db:mappings:update': (mapping: any) => any;
  'db:mappings:delete': (id: number) => boolean;
  'db:mappings:verify': (id: number, verifiedBy: string) => any;
  'db:mappings:getStats': () => any;
  
  // Settings operations
  'settings:get': (key: string) => any;
  'settings:set': (key: string, value: any) => void;
  'settings:getAll': () => Record<string, any>;
  'settings:reset': () => void;
  
  // Application operations
  'app:getVersion': () => string;
  'app:getPath': (name: string) => string;
  'app:restart': () => void;
}

export interface FileSelectOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >;
}

export interface IpcResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

// Event types for renderer to main communication
export type IpcChannelKey = keyof IpcChannels;

// Helper type for IPC invoke handlers
export type IpcHandler<T extends IpcChannelKey> = (
  ...args: Parameters<IpcChannels[T]>
) => Promise<ReturnType<IpcChannels[T]>> | ReturnType<IpcChannels[T]>;