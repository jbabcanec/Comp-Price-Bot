import { ipcMain } from 'electron';
import { getDatabaseService } from '../../database';
import { IPC_CHANNELS } from '../channels';
import { ProductCreateInput, ProductUpdateInput } from '@shared/types/product.types';
import { MappingCreateInput, MappingUpdateInput } from '@shared/types/mapping.types';
import { CompetitorDataCreateInput } from '../../database/repositories/competitorData.repo';
import { logger } from '../../services/logger.service';

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
    logger.info('database', 'Starting bulk product import', { 
      productCount: products.length 
    });
    
    const startTime = Date.now();
    
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
      
      logger.debug('database', 'Products converted for bulk insert', {
        originalCount: products.length,
        convertedCount: convertedProducts.length
      });
      
      const result = await dbService.products.bulkCreate(convertedProducts);
      const duration = Date.now() - startTime;
      
      logger.info('database', 'Bulk product import completed', {
        requestedCount: products.length,
        insertedCount: result,
        skippedCount: products.length - result,
        durationMs: duration,
        avgPerProduct: Math.round(duration / products.length)
      });
      
      return { success: true, data: result };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('database', 'Bulk product import failed', 
        error instanceof Error ? error : new Error(String(error)),
        { productCount: products.length, durationMs: duration }
      );
      
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

  // Competitor Data handlers
  ipcMain.handle(IPC_CHANNELS.DB_COMPETITOR_DATA_CREATE, async (_, data: CompetitorDataCreateInput) => {
    try {
      const result = await dbService.competitorData.create(data);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Competitor Data Create:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COMPETITOR_DATA_CREATE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_COMPETITOR_DATA_FIND_ALL, async (_, filters?: any) => {
    try {
      const result = await dbService.competitorData.findAll(filters);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Competitor Data FindAll:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COMPETITOR_DATA_FIND_ALL_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_COMPETITOR_DATA_BULK_CREATE, async (_, dataList: CompetitorDataCreateInput[]) => {
    try {
      const result = await dbService.competitorData.bulkCreate(dataList);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Competitor Data BulkCreate:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COMPETITOR_DATA_BULK_CREATE_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_COMPETITOR_DATA_GET_COMPANIES, async () => {
    try {
      const result = await dbService.competitorData.getCompaniesList();
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Competitor Data GetCompanies:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COMPETITOR_DATA_GET_COMPANIES_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_COMPETITOR_DATA_DELETE, async (_, id: number) => {
    try {
      const result = await dbService.competitorData.delete(id);
      return { success: true, data: result };
    } catch (error) {
      console.error('IPC Error - Competitor Data Delete:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'COMPETITOR_DATA_DELETE_ERROR'
        } 
      };
    }
  });

  // Purge handlers
  ipcMain.handle(IPC_CHANNELS.DB_PURGE_ALL_DATA, async () => {
    try {
      await dbService.beginTransaction();
      let totalDeleted = 0;
      
      try {
        // Purge in the correct order to avoid foreign key constraints
        const historyDeleted = await dbService.history.purgeAll();
        const mappingsDeleted = await dbService.mappings.purgeAll();
        const competitorDataDeleted = await dbService.competitorData.purgeAll();
        const productsDeleted = await dbService.products.purgeAll();
        
        totalDeleted = historyDeleted + mappingsDeleted + competitorDataDeleted + productsDeleted;
        
        await dbService.commit();
        
        return { 
          success: true, 
          data: { 
            totalDeleted,
            breakdown: {
              history: historyDeleted,
              mappings: mappingsDeleted,
              competitorData: competitorDataDeleted,
              products: productsDeleted
            }
          } 
        };
      } catch (error) {
        await dbService.rollback();
        throw error;
      }
    } catch (error) {
      console.error('IPC Error - Purge All Data:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PURGE_ALL_DATA_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PURGE_PRODUCTS, async () => {
    logger.info('database', 'Starting product purge operation');
    const startTime = Date.now();
    
    try {
      const result = await dbService.products.purgeAll();
      const duration = Date.now() - startTime;
      
      logger.info('database', 'Product purge completed', {
        deletedCount: result,
        durationMs: duration
      });
      
      return { success: true, data: { deleted: result } };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('database', 'Product purge failed', 
        error instanceof Error ? error : new Error(String(error)),
        { durationMs: duration }
      );
      
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PURGE_PRODUCTS_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PURGE_MAPPINGS, async () => {
    try {
      const result = await dbService.mappings.purgeAll();
      return { success: true, data: { deleted: result } };
    } catch (error) {
      console.error('IPC Error - Purge Mappings:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PURGE_MAPPINGS_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PURGE_COMPETITOR_DATA, async () => {
    try {
      const result = await dbService.competitorData.purgeAll();
      return { success: true, data: { deleted: result } };
    } catch (error) {
      console.error('IPC Error - Purge Competitor Data:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PURGE_COMPETITOR_DATA_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_PURGE_HISTORY, async () => {
    try {
      const result = await dbService.history.purgeAll();
      return { success: true, data: { deleted: result } };
    } catch (error) {
      console.error('IPC Error - Purge History:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'PURGE_HISTORY_ERROR'
        } 
      };
    }
  });

  // Selective unloading handlers
  ipcMain.handle(IPC_CHANNELS.DB_GET_PRICE_BOOK_SUMMARY, async () => {
    try {
      const [
        productBrands,
        mappingCompanies,
        competitorCompanies,
        historyCompanies,
        productCounts,
        mappingCounts,
        competitorCounts,
        historyCounts
      ] = await Promise.all([
        dbService.products.getBrands(),
        dbService.mappings.getCompanies(),
        dbService.competitorData.getCompaniesList(),
        dbService.history.getCompanies(),
        dbService.products.getCountsByBrand(),
        dbService.mappings.getCountsByCompany(),
        dbService.competitorData.getCountsByCompany(),
        dbService.history.getCountsByCompany()
      ]);

      // Combine all unique companies
      const allCompanies = [...new Set([
        ...mappingCompanies,
        ...competitorCompanies,
        ...historyCompanies
      ])].sort();

      // Combine counts by company
      const companySummary = allCompanies.map(company => {
        const mappings = mappingCounts.find(c => c.company === company)?.count || 0;
        const competitorData = competitorCounts.find(c => c.company === company)?.count || 0;
        const history = historyCounts.find(c => c.company === company)?.count || 0;
        
        return {
          company,
          mappings,
          competitorData,
          history,
          total: mappings + competitorData + history
        };
      });

      return {
        success: true,
        data: {
          brands: productBrands,
          companies: allCompanies,
          productCounts,
          companySummary
        }
      };
    } catch (error) {
      console.error('IPC Error - Get Price Book Summary:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'GET_PRICE_BOOK_SUMMARY_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_DELETE_BY_COMPANY, async (_, companies: string[]) => {
    try {
      await dbService.beginTransaction();
      
      try {
        const results = await Promise.all([
          dbService.mappings.deleteByCompanies(companies),
          dbService.competitorData.deleteByCompanies(companies),
          dbService.history.deleteByCompanies(companies)
        ]);

        const [mappingsDeleted, competitorDataDeleted, historyDeleted] = results;
        const totalDeleted = mappingsDeleted + competitorDataDeleted + historyDeleted;

        await dbService.commit();

        return {
          success: true,
          data: {
            totalDeleted,
            breakdown: {
              mappings: mappingsDeleted,
              competitorData: competitorDataDeleted,
              history: historyDeleted
            },
            companies
          }
        };
      } catch (error) {
        await dbService.rollback();
        throw error;
      }
    } catch (error) {
      console.error('IPC Error - Delete By Company:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'DELETE_BY_COMPANY_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_DELETE_BY_BRAND, async (_, brands: string[]) => {
    try {
      await dbService.beginTransaction();
      
      try {
        const productsDeleted = await dbService.products.deleteByBrands(brands);
        // Note: Mappings are typically by competitor company, not our brand
        // But we could also delete mappings for our products if needed
        
        await dbService.commit();

        return {
          success: true,
          data: {
            totalDeleted: productsDeleted,
            breakdown: {
              products: productsDeleted
            },
            brands
          }
        };
      } catch (error) {
        await dbService.rollback();
        throw error;
      }
    } catch (error) {
      console.error('IPC Error - Delete By Brand:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'DELETE_BY_BRAND_ERROR'
        } 
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.DB_UNLOAD_PRICE_BOOK, async (_, options: {
    type: 'company' | 'brand';
    values: string[];
  }) => {
    try {
      if (options.type === 'company') {
        await dbService.beginTransaction();
        
        try {
          const results = await Promise.all([
            dbService.mappings.deleteByCompanies(options.values),
            dbService.competitorData.deleteByCompanies(options.values),
            dbService.history.deleteByCompanies(options.values)
          ]);

          const [mappingsDeleted, competitorDataDeleted, historyDeleted] = results;
          const totalDeleted = mappingsDeleted + competitorDataDeleted + historyDeleted;

          await dbService.commit();

          return {
            success: true,
            data: {
              totalDeleted,
              breakdown: {
                mappings: mappingsDeleted,
                competitorData: competitorDataDeleted,
                history: historyDeleted
              },
              companies: options.values
            }
          };
        } catch (error) {
          await dbService.rollback();
          throw error;
        }
      } else if (options.type === 'brand') {
        await dbService.beginTransaction();
        
        try {
          const productsDeleted = await dbService.products.deleteByBrands(options.values);
          
          await dbService.commit();

          return {
            success: true,
            data: {
              totalDeleted: productsDeleted,
              breakdown: {
                products: productsDeleted
              },
              brands: options.values
            }
          };
        } catch (error) {
          await dbService.rollback();
          throw error;
        }
      } else {
        throw new Error('Invalid unload type. Must be "company" or "brand".');
      }
    } catch (error) {
      console.error('IPC Error - Unload Price Book:', error);
      return { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'UNLOAD_PRICE_BOOK_ERROR'
        } 
      };
    }
  });

  console.log('Database IPC handlers registered');
}