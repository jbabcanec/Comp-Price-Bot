import { DatabaseConnection } from '../connection';
import { Mapping, MappingCreateInput, MappingUpdateInput, MappingSearchFilters } from '@shared/types/mapping.types';

export class MappingsRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new mapping
   */
  async create(mapping: MappingCreateInput): Promise<Mapping> {
    const sql = `
      INSERT INTO crosswalk_mappings (
        our_sku, competitor_sku, competitor_company, confidence,
        match_method, verified, verified_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      mapping.our_sku,
      mapping.competitor_sku,
      mapping.competitor_company,
      mapping.confidence,
      mapping.match_method,
      mapping.verified || false,
      mapping.verified_by,
      mapping.notes,
    ];

    const result = await this.db.run(sql, params);
    const createdMapping = await this.findById(result.lastID);
    
    if (!createdMapping) {
      throw new Error('Failed to create mapping');
    }
    
    return createdMapping;
  }

  /**
   * Find mapping by ID
   */
  async findById(id: number): Promise<Mapping | undefined> {
    const sql = 'SELECT * FROM crosswalk_mappings WHERE id = ?';
    return this.db.get<Mapping>(sql, [id]);
  }

  /**
   * Find mapping by competitor SKU and company
   */
  async findByCompetitorSku(competitorSku: string, company: string): Promise<Mapping | undefined> {
    const sql = 'SELECT * FROM crosswalk_mappings WHERE competitor_sku = ? AND competitor_company = ?';
    return this.db.get<Mapping>(sql, [competitorSku, company]);
  }

  /**
   * Find all crosswalk_mappings for a specific SKU
   */
  async findByOurSku(ourSku: string): Promise<Mapping[]> {
    const sql = 'SELECT * FROM crosswalk_mappings WHERE our_sku = ? ORDER BY confidence DESC, created_at DESC';
    return this.db.all<Mapping>(sql, [ourSku]);
  }

  /**
   * Find all crosswalk_mappings with optional filters
   */
  async findAll(filters?: MappingSearchFilters, limit?: number, offset?: number): Promise<Mapping[]> {
    let sql = 'SELECT * FROM crosswalk_mappings WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.our_sku) {
        sql += ' AND our_sku = ?';
        params.push(filters.our_sku);
      }
      
      if (filters.competitor_company) {
        sql += ' AND competitor_company = ?';
        params.push(filters.competitor_company);
      }
      
      if (filters.verified !== undefined) {
        sql += ' AND verified = ?';
        params.push(filters.verified);
      }
      
      if (filters.min_confidence) {
        sql += ' AND confidence >= ?';
        params.push(filters.min_confidence);
      }
      
      if (filters.match_method) {
        sql += ' AND match_method = ?';
        params.push(filters.match_method);
      }
    }

    sql += ' ORDER BY confidence DESC, created_at DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    }

    return this.db.all<Mapping>(sql, params);
  }

  /**
   * Update a mapping
   */
  async update(mapping: MappingUpdateInput): Promise<Mapping> {
    const current = await this.findById(mapping.id);
    if (!current) {
      throw new Error(`Mapping with ID ${mapping.id} not found`);
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (mapping.our_sku !== undefined) {
      updates.push('our_sku = ?');
      params.push(mapping.our_sku);
    }
    if (mapping.competitor_sku !== undefined) {
      updates.push('competitor_sku = ?');
      params.push(mapping.competitor_sku);
    }
    if (mapping.competitor_company !== undefined) {
      updates.push('competitor_company = ?');
      params.push(mapping.competitor_company);
    }
    if (mapping.confidence !== undefined) {
      updates.push('confidence = ?');
      params.push(mapping.confidence);
    }
    if (mapping.match_method !== undefined) {
      updates.push('match_method = ?');
      params.push(mapping.match_method);
    }
    if (mapping.verified !== undefined) {
      updates.push('verified = ?');
      params.push(mapping.verified);
    }
    if (mapping.verified_by !== undefined) {
      updates.push('verified_by = ?');
      params.push(mapping.verified_by);
    }
    if (mapping.notes !== undefined) {
      updates.push('notes = ?');
      params.push(mapping.notes);
    }

    if (updates.length === 0) {
      return current;
    }

    // Add verified_at if verifying
    if (mapping.verified === true && !current.verified) {
      updates.push('verified_at = CURRENT_TIMESTAMP');
    }

    params.push(mapping.id);
    const sql = `UPDATE crosswalk_mappings SET ${updates.join(', ')} WHERE id = ?`;
    
    await this.db.run(sql, params);
    const updated = await this.findById(mapping.id);
    
    if (!updated) {
      throw new Error('Failed to update mapping');
    }
    
    return updated;
  }

  /**
   * Delete a mapping
   */
  async delete(id: number): Promise<boolean> {
    const sql = 'DELETE FROM crosswalk_mappings WHERE id = ?';
    const result = await this.db.run(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Verify a mapping
   */
  async verify(id: number, verifiedBy: string): Promise<Mapping> {
    return this.update({
      id,
      verified: true,
      verified_by: verifiedBy,
    });
  }

  /**
   * Unverify a mapping
   */
  async unverify(id: number): Promise<Mapping> {
    const sql = `
      UPDATE crosswalk_mappings 
      SET verified = FALSE, verified_by = NULL, verified_at = NULL
      WHERE id = ?
    `;
    
    await this.db.run(sql, [id]);
    const updated = await this.findById(id);
    
    if (!updated) {
      throw new Error('Failed to unverify mapping');
    }
    
    return updated;
  }

  /**
   * Get mapping statistics
   */
  async getStats(): Promise<{
    total: number;
    verified: number;
    unverified: number;
    byMethod: Record<string, number>;
    byCompany: Record<string, number>;
  }> {
    const totalResult = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM crosswalk_mappings');
    const verifiedResult = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM crosswalk_mappings WHERE verified = TRUE');
    
    const methodResults = await this.db.all<{ match_method: string; count: number }>(
      'SELECT match_method, COUNT(*) as count FROM crosswalk_mappings GROUP BY match_method'
    );
    
    const companyResults = await this.db.all<{ competitor_company: string; count: number }>(
      'SELECT competitor_company, COUNT(*) as count FROM crosswalk_mappings GROUP BY competitor_company ORDER BY count DESC'
    );

    const byMethod: Record<string, number> = {};
    methodResults.forEach(result => {
      byMethod[result.match_method] = result.count;
    });

    const byCompany: Record<string, number> = {};
    companyResults.forEach(result => {
      byCompany[result.competitor_company] = result.count;
    });

    return {
      total: totalResult?.count || 0,
      verified: verifiedResult?.count || 0,
      unverified: (totalResult?.count || 0) - (verifiedResult?.count || 0),
      byMethod,
      byCompany,
    };
  }

  /**
   * Get count with optional filters
   */
  async count(filters?: MappingSearchFilters): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM crosswalk_mappings WHERE 1=1';
    const params: any[] = [];

    if (filters) {
      if (filters.our_sku) {
        sql += ' AND our_sku = ?';
        params.push(filters.our_sku);
      }
      
      if (filters.competitor_company) {
        sql += ' AND competitor_company = ?';
        params.push(filters.competitor_company);
      }
      
      if (filters.verified !== undefined) {
        sql += ' AND verified = ?';
        params.push(filters.verified);
      }
      
      if (filters.min_confidence) {
        sql += ' AND confidence >= ?';
        params.push(filters.min_confidence);
      }
      
      if (filters.match_method) {
        sql += ' AND match_method = ?';
        params.push(filters.match_method);
      }
    }

    const result = await this.db.get<{ count: number }>(sql, params);
    return result?.count || 0;
  }

  /**
   * Purge all crosswalk_mappings from the database
   */
  async purgeAll(): Promise<number> {
    const sql = 'DELETE FROM crosswalk_mappings';
    const result = await this.db.run(sql, []);
    return result.changes;
  }

  /**
   * Delete crosswalk_mappings by competitor company
   */
  async deleteByCompany(company: string): Promise<number> {
    const sql = 'DELETE FROM crosswalk_mappings WHERE competitor_company = ?';
    const result = await this.db.run(sql, [company]);
    return result.changes;
  }

  /**
   * Delete crosswalk_mappings by multiple companies
   */
  async deleteByCompanies(companies: string[]): Promise<number> {
    if (companies.length === 0) return 0;
    
    const placeholders = companies.map(() => '?').join(',');
    const sql = `DELETE FROM crosswalk_mappings WHERE competitor_company IN (${placeholders})`;
    const result = await this.db.run(sql, companies);
    return result.changes;
  }

  /**
   * Get all unique competitor companies
   */
  async getCompanies(): Promise<string[]> {
    const sql = 'SELECT DISTINCT competitor_company FROM crosswalk_mappings ORDER BY competitor_company';
    const results = await this.db.all<{ competitor_company: string }>(sql, []);
    return results.map(r => r.competitor_company);
  }

  /**
   * Get mapping count by company
   */
  async getCountsByCompany(): Promise<{ company: string; count: number }[]> {
    const sql = 'SELECT competitor_company as company, COUNT(*) as count FROM crosswalk_mappings GROUP BY competitor_company ORDER BY competitor_company';
    return this.db.all<{ company: string; count: number }>(sql, []);
  }

  /**
   * Delete crosswalk_mappings by our brand (Lennox products)
   */
  async deleteByOurBrand(brand: string): Promise<number> {
    const sql = 'DELETE FROM crosswalk_mappings WHERE our_sku LIKE ?';
    const result = await this.db.run(sql, [`${brand}%`]);
    return result.changes;
  }
}