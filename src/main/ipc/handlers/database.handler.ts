import { ipcMain } from 'electron';
import { getDatabaseService } from '../../database';
import { IPC_CHANNELS } from '../channels';
import { ProductCreateInput, ProductUpdateInput } from '@shared/types/product.types';
import { MappingCreateInput, MappingUpdateInput } from '@shared/types/mapping.types';

/**
 * Register all database-related IPC handlers
 */
export function registerDatabaseHandlers(): void {
  const dbService = getDatabaseService();

  // Product handlers
  ipcMain.handle(IPC_CHANNELS.DB_PRODUCTS_CREATE, async (_, product: ProductCreateInput) => {
    try {
      const result = await dbService.products.create(product);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Products Create:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PRODUCTS_CREATE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PRODUCTS_FIND_ALL, async (_, filters?: any) => {
    try {
      const result = await dbService.products.findAll(filters);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Products FindAll:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PRODUCTS_FIND_ALL_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PRODUCTS_FIND_BY_ID, async (_, id: number) => {
    try {
      const result = await dbService.products.findById(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Products FindById:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PRODUCTS_FIND_BY_ID_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PRODUCTS_UPDATE, async (_, product: ProductUpdateInput) => {
    try {
      const result = await dbService.products.update(product);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Products Update:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PRODUCTS_UPDATE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PRODUCTS_DELETE, async (_, id: number) => {
    try {
      const result = await dbService.products.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Products Delete:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PRODUCTS_DELETE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PRODUCTS_BULK_CREATE, async (_, products: any[]) => {
    try {
      // Convert UniversalProduct format to ProductCreateInput format
      const convertedProducts: ProductCreateInput[] = products.map(product => ({
        sku: product.sku,
        model: product.model,
        brand: product.brand,
        type: product.primaryType || product.type, // Handle both UniversalProduct (primaryType) and ProductCreateInput (type)
        tonnage: product.tonnage,
        seer: product.seer,
        seer2: product.seer2,
        afue: product.afue,
        hspf: product.hspf,
        refrigerant: product.refrigerant,
        stage: product.stage,
        description: product.description,
        msrp: product.msrp,
        category: product.category,
        subcategory: product.subcategory
      }));
      
      const result = await dbService.products.bulkCreate(convertedProducts);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Products BulkCreate:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PRODUCTS_BULK_CREATE_ERROR'
        } 
      };
    }
  });

  // Mapping handlers
  ipcMain.handle(IPC_CHANNELS.DB_MAPPINGS_CREATE, async (_, mapping: MappingCreateInput) => {
    try {
      const result = await dbService.mappings.create(mapping);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Mappings Create:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MAPPINGS_CREATE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_MAPPINGS_FIND_ALL, async (_, filters?: any) => {
    try {
      const result = await dbService.mappings.findAll(filters);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Mappings FindAll:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MAPPINGS_FIND_ALL_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_MAPPINGS_FIND_BY_ID, async (_, id: number) => {
    try {
      const result = await dbService.mappings.findById(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Mappings FindById:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MAPPINGS_FIND_BY_ID_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_MAPPINGS_UPDATE, async (_, mapping: MappingUpdateInput) => {
    try {
      const result = await dbService.mappings.update(mapping);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Mappings Update:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MAPPINGS_UPDATE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_MAPPINGS_DELETE, async (_, id: number) => {
    try {
      const result = await dbService.mappings.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Mappings Delete:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MAPPINGS_DELETE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_MAPPINGS_VERIFY, async (_, id: number, verifiedBy: string) => {
    try {
      const result = await dbService.mappings.verify(id, verifiedBy);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Mappings Verify:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MAPPINGS_VERIFY_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_MAPPINGS_GET_STATS, async () => {
    try {
      const result = await dbService.mappings.getStats();
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Mappings GetStats:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'MAPPINGS_GET_STATS_ERROR'
        } 
      };
    }
  });

  console.log('Database IPC handlers registered');
}