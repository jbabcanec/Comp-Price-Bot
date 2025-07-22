import { DatabaseService } from '../index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Database Service', () => {
  let dbService: DatabaseService;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create a temporary database for testing
    tempDbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.db`);
    
    // Mock app.getPath to return our temp directory
    jest.mock('electron', () => ({
      app: {
        getPath: () => path.dirname(tempDbPath),
      },
    }));

    dbService = new DatabaseService();
    await dbService.initialize();
  });

  afterEach(async () => {
    await dbService.close();
    
    // Clean up temp database file
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  describe('Product Operations', () => {
    it('should create and retrieve a product', async () => {
      const productData = {
        sku: 'TEST-001',
        model: 'TestModel',
        brand: 'TestBrand',
        type: 'AC' as const,
        tonnage: 3,
        seer: 16,
      };

      const created = await dbService.products.create(productData);
      expect(created.id).toBeDefined();
      expect(created.sku).toBe(productData.sku);
      expect(created.model).toBe(productData.model);

      const retrieved = await dbService.products.findBySku('TEST-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.sku).toBe(productData.sku);
    });

    it('should update a product', async () => {
      const productData = {
        sku: 'TEST-002',
        model: 'TestModel2',
        brand: 'TestBrand',
        type: 'Heat Pump' as const,
        tonnage: 2,
        seer: 14,
      };

      const created = await dbService.products.create(productData);
      const updated = await dbService.products.update({
        id: created.id!,
        seer: 18,
        model: 'UpdatedModel',
      });

      expect(updated.seer).toBe(18);
      expect(updated.model).toBe('UpdatedModel');
      expect(updated.sku).toBe(productData.sku); // Should remain unchanged
    });

    it('should find products by specifications', async () => {
      // Create test products
      await dbService.products.create({
        sku: 'AC-001',
        model: 'AC Model 1',
        brand: 'Brand A',
        type: 'AC',
        tonnage: 3,
        seer: 16,
      });

      await dbService.products.create({
        sku: 'AC-002',
        model: 'AC Model 2',
        brand: 'Brand B',
        type: 'AC',
        tonnage: 3.5,
        seer: 15,
      });

      await dbService.products.create({
        sku: 'HP-001',
        model: 'Heat Pump 1',
        brand: 'Brand A',
        type: 'Heat Pump',
        tonnage: 3,
        seer: 16,
      });

      const acProducts = await dbService.products.findBySpecs('AC', 3, 16, 0.5);
      expect(acProducts).toHaveLength(2); // Both AC units within tolerance
      expect(acProducts.every(p => p.type === 'AC')).toBe(true);

      const exactMatch = await dbService.products.findBySpecs('Heat Pump', 3, 16, 0.1);
      expect(exactMatch).toHaveLength(1);
      expect(exactMatch[0].sku).toBe('HP-001');
    });

    it('should bulk create products', async () => {
      const products = [
        {
          sku: 'BULK-001',
          model: 'Bulk Model 1',
          brand: 'Brand X',
          type: 'AC' as const,
          tonnage: 2,
          seer: 14,
        },
        {
          sku: 'BULK-002',
          model: 'Bulk Model 2',
          brand: 'Brand X',
          type: 'Furnace' as const,
          afue: 95,
        },
        {
          sku: 'BULK-003',
          model: 'Bulk Model 3',
          brand: 'Brand Y',
          type: 'Heat Pump' as const,
          tonnage: 4,
          seer: 18,
          hspf: 10,
        },
      ];

      const insertedCount = await dbService.products.bulkCreate(products);
      expect(insertedCount).toBe(3);

      const allProducts = await dbService.products.findAll();
      expect(allProducts).toHaveLength(3);
    });
  });

  describe('Mapping Operations', () => {
    beforeEach(async () => {
      // Create a test product first
      await dbService.products.create({
        sku: 'OUR-001',
        model: 'Our Model',
        brand: 'Our Brand',
        type: 'AC',
        tonnage: 3,
        seer: 16,
      });
    });

    it('should create and retrieve a mapping', async () => {
      const mappingData = {
        our_sku: 'OUR-001',
        competitor_sku: 'COMP-001',
        competitor_company: 'Competitor Co',
        confidence: 0.9,
        match_method: 'exact' as const,
      };

      const created = await dbService.mappings.create(mappingData);
      expect(created.id).toBeDefined();
      expect(created.confidence).toBe(0.9);
      expect(created.verified).toBe(false);

      const retrieved = await dbService.mappings.findByCompetitorSku('COMP-001', 'Competitor Co');
      expect(retrieved).toBeDefined();
      expect(retrieved?.our_sku).toBe('OUR-001');
    });

    it('should verify and unverify mappings', async () => {
      const mappingData = {
        our_sku: 'OUR-001',
        competitor_sku: 'COMP-002',
        competitor_company: 'Test Corp',
        confidence: 0.85,
        match_method: 'specs' as const,
      };

      const created = await dbService.mappings.create(mappingData);
      expect(created.verified).toBe(false);

      const verified = await dbService.mappings.verify(created.id!, 'test-user');
      expect(verified.verified).toBe(true);
      expect(verified.verified_by).toBe('test-user');
      expect(verified.verified_at).toBeDefined();

      const unverified = await dbService.mappings.unverify(created.id!);
      expect(unverified.verified).toBe(false);
      expect(unverified.verified_by).toBe(null);
    });

    it('should get mapping statistics', async () => {
      // Create test mappings
      await dbService.mappings.create({
        our_sku: 'OUR-001',
        competitor_sku: 'COMP-A',
        competitor_company: 'Company A',
        confidence: 0.95,
        match_method: 'exact',
        verified: true,
      });

      await dbService.mappings.create({
        our_sku: 'OUR-001',
        competitor_sku: 'COMP-B',
        competitor_company: 'Company B',
        confidence: 0.8,
        match_method: 'specs',
      });

      await dbService.mappings.create({
        our_sku: 'OUR-001',
        competitor_sku: 'COMP-C',
        competitor_company: 'Company A',
        confidence: 0.7,
        match_method: 'ai',
      });

      const stats = await dbService.mappings.getStats();
      expect(stats.total).toBe(3);
      expect(stats.verified).toBe(1);
      expect(stats.unverified).toBe(2);
      expect(stats.byMethod.exact).toBe(1);
      expect(stats.byMethod.specs).toBe(1);
      expect(stats.byMethod.ai).toBe(1);
      expect(stats.byCompany['Company A']).toBe(2);
      expect(stats.byCompany['Company B']).toBe(1);
    });
  });

  describe('Database Health', () => {
    it('should pass health check', async () => {
      const isHealthy = await dbService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should return correct database version', async () => {
      const version = await dbService.getVersion();
      expect(version).toBe(1); // Initial migration version
    });
  });
});