// IPC channel constants
// This file defines all the IPC channels used in the application

export const IPC_CHANNELS = {
  // Window operations
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  
  // File operations
  FILE_SELECT: 'file:select',
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  
  // Database operations - Products
  DB_PRODUCTS_CREATE: 'db:products:create',
  DB_PRODUCTS_FIND_ALL: 'db:products:findAll',
  DB_PRODUCTS_FIND_BY_ID: 'db:products:findById',
  DB_PRODUCTS_UPDATE: 'db:products:update',
  DB_PRODUCTS_DELETE: 'db:products:delete',
  DB_PRODUCTS_BULK_CREATE: 'db:products:bulkCreate',
  
  // Database operations - Mappings
  DB_MAPPINGS_CREATE: 'db:mappings:create',
  DB_MAPPINGS_FIND_ALL: 'db:mappings:findAll',
  DB_MAPPINGS_FIND_BY_ID: 'db:mappings:findById',
  DB_MAPPINGS_UPDATE: 'db:mappings:update',
  DB_MAPPINGS_DELETE: 'db:mappings:delete',
  DB_MAPPINGS_VERIFY: 'db:mappings:verify',
  DB_MAPPINGS_GET_STATS: 'db:mappings:getStats',
  
  // Settings operations
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_RESET: 'settings:reset',
  
  // Application operations
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PATH: 'app:getPath',
  APP_RESTART: 'app:restart',
} as const;