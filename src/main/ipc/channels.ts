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
  FILE_PROCESS: 'file:process',
  FILE_SCAN_DIRECTORY: 'file:scanDirectory',
  FILE_PROCESS_BATCH: 'file:processBatch',
  FILE_SAVE_TEMP: 'file:saveTemp',
  
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
  
  // Database operations - Competitor Data
  DB_COMPETITOR_DATA_CREATE: 'db:competitorData:create',
  DB_COMPETITOR_DATA_FIND_ALL: 'db:competitorData:findAll',
  DB_COMPETITOR_DATA_BULK_CREATE: 'db:competitorData:bulkCreate',
  DB_COMPETITOR_DATA_GET_COMPANIES: 'db:competitorData:getCompanies',
  DB_COMPETITOR_DATA_DELETE: 'db:competitorData:delete',
  
  // Database operations - Bulk operations
  DB_PURGE_ALL_DATA: 'db:purgeAllData',
  DB_PURGE_PRODUCTS: 'db:purgeProducts',
  DB_PURGE_MAPPINGS: 'db:purgeMappings',
  DB_PURGE_COMPETITOR_DATA: 'db:purgeCompetitorData',
  DB_PURGE_HISTORY: 'db:purgeHistory',
  
  // Database operations - Selective unloading
  DB_UNLOAD_PRICE_BOOK: 'db:unloadPriceBook',
  DB_GET_PRICE_BOOK_SUMMARY: 'db:getPriceBookSummary',
  DB_DELETE_BY_COMPANY: 'db:deleteByCompany',
  DB_DELETE_BY_BRAND: 'db:deleteByBrand',
  
  // Settings operations
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_RESET: 'settings:reset',
  
  // API Key operations
  API_KEY_STORE_OPENAI: 'api-key:store-openai',
  API_KEY_GET_OPENAI: 'api-key:get-openai',
  API_KEY_HAS_OPENAI: 'api-key:has-openai',
  API_KEY_GET_METADATA: 'api-key:get-metadata',
  API_KEY_REMOVE_OPENAI: 'api-key:remove-openai',
  API_KEY_VALIDATE_OPENAI: 'api-key:validate-openai',
  API_KEY_GET_USAGE: 'api-key:get-usage',
  API_KEY_SECURE_STORAGE_AVAILABLE: 'api-key:secure-storage-available',
  
  // History operations
  HISTORY_GET_ALL: 'history:getAll',
  HISTORY_GET_BY_COMPANY: 'history:getByCompany',
  HISTORY_GET_ANALYTICS: 'history:getAnalytics',
  HISTORY_CREATE: 'history:create',
  HISTORY_DELETE: 'history:delete',
  HISTORY_GET_STATS_BY_DATE: 'history:getStatsByDate',
  HISTORY_EXPORT_CSV: 'history:exportCsv',
  
  // Application operations
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PATH: 'app:getPath',
  APP_RESTART: 'app:restart',
} as const;