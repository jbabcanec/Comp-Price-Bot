import { DatabaseConnection } from '../connection';

export interface CompetitorData {
  id?: number;
  sku: string;
  company: string;
  price?: number;
  description?: string;
  source_file?: string;
  last_seen?: string;
  created_at?: string;
}

export interface CompetitorDataCreateInput {
  sku: string;
  company: string;
  price?: number;
  description?: string;
  source_file?: string;
}

export interface CompetitorDataFilters {
  company?: string;
  priceMin?: number;
  priceMax?: number;
  search?: string;
}

export class CompetitorDataRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async create(data: CompetitorDataCreateInput): Promise<CompetitorData> {
    const sql = `
      INSERT OR REPLACE INTO competitor_data (
        sku, company, price, description, source_file, last_seen
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    const params = [
      data.sku,
      data.company,
      data.price,
      data.description,
      data.source_file
    ];

    const result = await this.db.run(sql, params);
    const created = await this.findById(result.lastID);
    
    if (!created) {
      throw new Error('Failed to create competitor data entry');
    }
    
    return created;
  }

  async findById(id: number): Promise<CompetitorData | undefined> {
    const sql = 'SELECT * FROM competitor_data WHERE id = ?';
    return this.db.get<CompetitorData>(sql, [id]);
  }

  async findBySku(sku: string, company?: string): Promise<CompetitorData[]> {
    let sql = 'SELECT * FROM competitor_data WHERE sku = ?';
    const params: any[] = [sku];
    
    if (company) {
      sql += ' AND company = ?';
      params.push(company);
    }
    
    return this.db.all<CompetitorData>(sql, params);
  }

  async findAll(filters?: CompetitorDataFilters, limit?: number, offset?: number): Promise<CompetitorData[]> {
    let sql = 'SELECT * FROM competitor_data WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.company) {
        sql += ' AND company = ?';
        params.push(filters.company);
      }
      
      if (filters.priceMin) {
        sql += ' AND price >= ?';
        params.push(filters.priceMin);
      }
      
      if (filters.priceMax) {
        sql += ' AND price <= ?';
        params.push(filters.priceMax);
      }
      
      if (filters.search) {
        sql += ' AND (sku LIKE ? OR company LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    sql += ' ORDER BY company, sku, last_seen DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    }

    return this.db.all<CompetitorData>(sql, params);
  }

  async bulkCreate(dataList: CompetitorDataCreateInput[]): Promise<number> {
    if (dataList.length === 0) return 0;

    await this.db.beginTransaction();
    
    try {
      let insertedCount = 0;
      
      for (const data of dataList) {
        try {
          await this.create(data);
          insertedCount++;
        } catch (error) {
          console.error('Bulk insert error for competitor data:', data.sku, error);
        }
      }
      
      await this.db.commit();
      return insertedCount;
    } catch (error) {
      await this.db.rollback();
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM competitor_data WHERE id = ?';
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  async count(filters?: CompetitorDataFilters): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM competitor_data WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.company) {
        sql += ' AND company = ?';
        params.push(filters.company);
      }
      
      if (filters.priceMin) {
        sql += ' AND price >= ?';
        params.push(filters.priceMin);
      }
      
      if (filters.priceMax) {
        sql += ' AND price <= ?';
        params.push(filters.priceMax);
      }
      
      if (filters.search) {
        sql += ' AND (sku LIKE ? OR company LIKE ? OR description LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
    }

    const result = await this.db.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  async getCompaniesList(): Promise<string[]> {
    const sql = 'SELECT DISTINCT company FROM competitor_data ORDER BY company';
    const results = await this.db.all<{ company: string }>(sql, []);
    return results.map(r => r.company);
  }

  async getLatestByCompany(company: string, limit: number = 100): Promise<CompetitorData[]> {
    const sql = `
      SELECT * FROM competitor_data 
      WHERE company = ? 
      ORDER BY last_seen DESC 
      LIMIT ?
    `;
    return this.db.all<CompetitorData>(sql, [company, limit]);
  }

  async updatePrice(id: number, price: number): Promise<CompetitorData | null> {
    const sql = `
      UPDATE competitor_data 
      SET price = ?, last_seen = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await this.db.run(sql, [price, id]);
    const result = await this.findById(id);
    return result || null;
  }
}