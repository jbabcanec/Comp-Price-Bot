import { DatabaseConnection } from '../connection';
import { Product, ProductCreateInput, ProductUpdateInput, ProductSearchFilters } from '@shared/types/product.types';

export class ProductsRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new product
   */
  async create(product: ProductCreateInput): Promise<Product> {
    const sql = `
      INSERT INTO products (
        sku, model, brand, type, tonnage, seer, seer2, 
        afue, hspf, refrigerant, stage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      product.sku,
      product.model,
      product.brand,
      product.type,
      product.tonnage,
      product.seer,
      product.seer2,
      product.afue,
      product.hspf,
      product.refrigerant,
      product.stage,
    ];

    const result = await this.db.run(sql, params);
    const createdProduct = await this.findById(result.lastID);
    
    if (!createdProduct) {
      throw new Error('Failed to create product');
    }
    
    return createdProduct;
  }

  /**
   * Find product by ID
   */
  async findById(id: number): Promise<Product | undefined> {
    const sql = 'SELECT * FROM products WHERE id = ?';
    return this.db.get<Product>(sql, [id]);
  }

  /**
   * Find product by SKU
   */
  async findBySku(sku: string): Promise<Product | undefined> {
    const sql = 'SELECT * FROM products WHERE sku = ?';
    return this.db.get<Product>(sql, [sku]);
  }

  /**
   * Find all products with optional filters
   */
  async findAll(filters?: ProductSearchFilters, limit?: number, offset?: number): Promise<Product[]> {
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.brand) {
        sql += ' AND brand = ?';
        params.push(filters.brand);
      }
      
      if (filters.type) {
        sql += ' AND type = ?';
        params.push(filters.type);
      }
      
      if (filters.tonnage) {
        sql += ' AND tonnage = ?';
        params.push(filters.tonnage);
      }
      
      if (filters.seer) {
        sql += ' AND seer >= ?';
        params.push(filters.seer);
      }
      
      if (filters.search) {
        sql += ' AND (sku LIKE ? OR model LIKE ? OR brand LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    sql += ' ORDER BY brand, type, tonnage, seer';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    }

    return this.db.all<Product>(sql, params);
  }

  /**
   * Update a product
   */
  async update(product: ProductUpdateInput): Promise<Product> {
    const current = await this.findById(product.id);
    if (!current) {
      throw new Error(`Product with ID ${product.id} not found`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (product.sku !== undefined) {
      updates.push('sku = ?');
      params.push(product.sku);
    }
    if (product.model !== undefined) {
      updates.push('model = ?');
      params.push(product.model);
    }
    if (product.brand !== undefined) {
      updates.push('brand = ?');
      params.push(product.brand);
    }
    if (product.type !== undefined) {
      updates.push('type = ?');
      params.push(product.type);
    }
    if (product.tonnage !== undefined) {
      updates.push('tonnage = ?');
      params.push(product.tonnage);
    }
    if (product.seer !== undefined) {
      updates.push('seer = ?');
      params.push(product.seer);
    }
    if (product.seer2 !== undefined) {
      updates.push('seer2 = ?');
      params.push(product.seer2);
    }
    if (product.afue !== undefined) {
      updates.push('afue = ?');
      params.push(product.afue);
    }
    if (product.hspf !== undefined) {
      updates.push('hspf = ?');
      params.push(product.hspf);
    }
    if (product.refrigerant !== undefined) {
      updates.push('refrigerant = ?');
      params.push(product.refrigerant);
    }
    if (product.stage !== undefined) {
      updates.push('stage = ?');
      params.push(product.stage);
    }

    if (updates.length === 0) {
      return current;
    }

    params.push(product.id);
    const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    
    await this.db.run(sql, params);
    const updated = await this.findById(product.id);
    
    if (!updated) {
      throw new Error('Failed to update product');
    }
    
    return updated;
  }

  /**
   * Delete a product
   */
  async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM products WHERE id = ?';
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Get total count with optional filters
   */
  async count(filters?: ProductSearchFilters): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.brand) {
        sql += ' AND brand = ?';
        params.push(filters.brand);
      }
      
      if (filters.type) {
        sql += ' AND type = ?';
        params.push(filters.type);
      }
      
      if (filters.tonnage) {
        sql += ' AND tonnage = ?';
        params.push(filters.tonnage);
      }
      
      if (filters.seer) {
        sql += ' AND seer >= ?';
        params.push(filters.seer);
      }
      
      if (filters.search) {
        sql += ' AND (sku LIKE ? OR model LIKE ? OR brand LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    const result = await this.db.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * Bulk insert products
   */
  async bulkCreate(products: ProductCreateInput[]): Promise<number> {
    if (products.length === 0) return 0;

    await this.db.beginTransaction();
    
    try {
      let insertedCount = 0;
      
      for (const product of products) {
        try {
          await this.create(product);
          insertedCount++;
        } catch (error) {
          // Skip duplicates, log other errors
          if (error instanceof Error && !error.message.includes('UNIQUE constraint failed')) {
            console.error('Bulk insert error for product:', product.sku, error);
          }
        }
      }
      
      await this.db.commit();
      return insertedCount;
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  /**
   * Find products by specifications (for matching)
   */
  async findBySpecs(type: string, tonnage?: number, seer?: number, tolerance: number = 0.5): Promise<Product[]> {
    let sql = 'SELECT * FROM products WHERE type = ?';
    const params: any[] = [type];

    if (tonnage) {
      sql += ' AND ABS(tonnage - ?) <= ?';
      params.push(tonnage, tolerance);
    }

    if (seer) {
      sql += ' AND ABS(seer - ?) <= ?';
      params.push(seer, tolerance);
    }

    sql += ' ORDER BY brand, model';
    
    return this.db.all<Product>(sql, params);
  }
}