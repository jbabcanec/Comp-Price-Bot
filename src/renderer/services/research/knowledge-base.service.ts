/**
 * Knowledge Base Service - Intelligent Cataloguing with Learning
 * Builds and maintains a comprehensive HVAC product knowledge base
 */

import { CompetitorProduct, OurProduct, MatchResult } from '@shared/types/matching.types';
import { WebSearchResult, ProductResearchResult } from './web-search.service';

export interface KnowledgeEntry {
  id: string;
  competitorSku: string;
  competitorCompany: string;
  confirmedSpecs: Record<string, any>;
  alternativeNames: string[];
  equivalentModels: Array<{
    ourSku: string;
    ourModel: string;
    confidence: number;
    verifiedBy: 'research' | 'manual' | 'ai';
    verifiedAt: Date;
    notes?: string;
  }>;
  sourceUrls: string[];
  lastResearched: Date;
  researchCount: number;
  reliability: number; // 0-1 based on source quality and verification
  tags: string[];
}

export interface LearningPattern {
  pattern: string;
  category: 'brand_family' | 'model_naming' | 'spec_correlation' | 'cross_reference';
  confidence: number;
  occurrences: number;
  lastSeen: Date;
  examples: string[];
}

export interface CatalogueStats {
  totalEntries: number;
  verifiedEntries: number;
  averageReliability: number;
  topBrands: Array<{ brand: string; count: number }>;
  researchCoverage: number;
  learningPatterns: number;
}

export class KnowledgeBaseService {
  private knowledgeCache = new Map<string, KnowledgeEntry>();
  private learningPatterns = new Map<string, LearningPattern>();

  /**
   * Add research results to knowledge base
   */
  async catalogueResearchResults(
    competitorProduct: CompetitorProduct,
    researchResult: ProductResearchResult,
    verifiedMatches?: MatchResult[]
  ): Promise<void> {
    const entryId = this.generateEntryId(competitorProduct);
    
    // Get or create knowledge entry
    let entry = this.knowledgeCache.get(entryId);
    if (!entry) {
      entry = this.createNewKnowledgeEntry(competitorProduct);
    }

    // Update entry with research findings
    this.updateEntryWithResearch(entry, researchResult);
    
    // Add verified matches if provided
    if (verifiedMatches) {
      this.updateVerifiedMatches(entry, verifiedMatches, 'manual');
    }

    // Extract and learn patterns
    await this.extractLearningPatterns(competitorProduct, researchResult);

    // Calculate reliability score
    entry.reliability = this.calculateReliability(entry, researchResult);

    // Save to cache and persistence
    this.knowledgeCache.set(entryId, entry);
    await this.persistKnowledgeEntry(entry);
  }

  /**
   * Query knowledge base for existing information
   */
  async queryKnowledge(
    competitorProduct: CompetitorProduct
  ): Promise<KnowledgeEntry | undefined> {
    const entryId = this.generateEntryId(competitorProduct);
    
    // Check cache first
    let entry = this.knowledgeCache.get(entryId);
    if (entry) {
      return entry;
    }

    // Load from database
    entry = await this.loadKnowledgeEntry(entryId);
    if (entry) {
      this.knowledgeCache.set(entryId, entry);
      return entry;
    }

    // Try fuzzy matching for similar SKUs
    return await this.findSimilarEntries(competitorProduct);
  }

  /**
   * Get smart suggestions based on learned patterns
   */
  async getSmartSuggestions(
    competitorProduct: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<Array<{ suggestion: MatchResult; reasoning: string; confidence: number }>> {
    const suggestions: Array<{ suggestion: MatchResult; reasoning: string; confidence: number }> = [];

    // 1. Check for brand family patterns
    const brandSuggestions = await this.getBrandFamilySuggestions(competitorProduct, ourProducts);
    suggestions.push(...brandSuggestions);

    // 2. Check for model naming patterns
    const modelSuggestions = await this.getModelPatternSuggestions(competitorProduct, ourProducts);
    suggestions.push(...modelSuggestions);

    // 3. Check for specification correlations
    const specSuggestions = await this.getSpecificationSuggestions(competitorProduct, ourProducts);
    suggestions.push(...specSuggestions);

    // 4. Check for historical cross-references
    const crossRefSuggestions = await this.getCrossReferenceSuggestions(competitorProduct, ourProducts);
    suggestions.push(...crossRefSuggestions);

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
  }

  /**
   * Learn from successful matches to improve future suggestions
   */
  async learnFromSuccess(
    competitorProduct: CompetitorProduct,
    ourProduct: OurProduct,
    matchMethod: string,
    confidence: number
  ): Promise<void> {
    // Extract patterns from successful match
    const patterns = this.extractSuccessPatterns(competitorProduct, ourProduct, matchMethod);

    for (const pattern of patterns) {
      await this.reinforceLearningPattern(pattern, confidence);
    }

    // Update knowledge entry
    const entry = await this.queryKnowledge(competitorProduct);
    if (entry) {
      // Add successful match to verified equivalents
      const equivalentMatch: KnowledgeEntry['equivalentModels'][0] = {
        ourSku: ourProduct.sku,
        ourModel: ourProduct.model,
        confidence,
        verifiedBy: 'ai',
        verifiedAt: new Date(),
        notes: `Learned from ${matchMethod} match`
      };

      entry.equivalentModels.push(equivalentMatch);
      entry.reliability = Math.min(1.0, entry.reliability + 0.05); // Small boost for successful learning

      await this.persistKnowledgeEntry(entry);
    }
  }

  /**
   * Get catalogue statistics
   */
  async getStats(): Promise<CatalogueStats> {
    const entries = Array.from(this.knowledgeCache.values());
    
    const totalEntries = entries.length;
    const verifiedEntries = entries.filter(e => e.equivalentModels.some(m => m.verifiedBy === 'manual')).length;
    const averageReliability = entries.length > 0 ? 
      entries.reduce((sum, e) => sum + e.reliability, 0) / entries.length : 0;

    // Count brands
    const brandCounts = new Map<string, number>();
    entries.forEach(entry => {
      const brand = entry.competitorCompany;
      brandCounts.set(brand, (brandCounts.get(brand) || 0) + 1);
    });

    const topBrands = Array.from(brandCounts.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const researchCoverage = entries.filter(e => e.researchCount > 0).length / Math.max(totalEntries, 1);
    const learningPatterns = this.learningPatterns.size;

    return {
      totalEntries,
      verifiedEntries,
      averageReliability,
      topBrands,
      researchCoverage,
      learningPatterns
    };
  }

  /**
   * Export knowledge base for backup or analysis
   */
  async exportKnowledgeBase(): Promise<{
    entries: KnowledgeEntry[];
    patterns: LearningPattern[];
    metadata: {
      exportDate: Date;
      version: string;
      stats: CatalogueStats;
    };
  }> {
    const entries = Array.from(this.knowledgeCache.values());
    const patterns = Array.from(this.learningPatterns.values());
    const stats = await this.getStats();

    return {
      entries,
      patterns,
      metadata: {
        exportDate: new Date(),
        version: '1.0',
        stats
      }
    };
  }

  /**
   * Import knowledge base from backup
   */
  async importKnowledgeBase(data: {
    entries: KnowledgeEntry[];
    patterns: LearningPattern[];
  }): Promise<void> {
    // Clear existing data
    this.knowledgeCache.clear();
    this.learningPatterns.clear();

    // Import entries
    for (const entry of data.entries) {
      const entryId = this.generateEntryId({
        sku: entry.competitorSku,
        company: entry.competitorCompany
      } as CompetitorProduct);
      this.knowledgeCache.set(entryId, entry);
    }

    // Import patterns
    for (const pattern of data.patterns) {
      this.learningPatterns.set(pattern.pattern, pattern);
    }

    console.log(`Imported ${data.entries.length} knowledge entries and ${data.patterns.length} learning patterns`);
  }

  // Private helper methods

  private generateEntryId(competitorProduct: CompetitorProduct): string {
    return `${competitorProduct.company.toLowerCase().replace(/\s+/g, '_')}_${competitorProduct.sku}`;
  }

  private createNewKnowledgeEntry(competitorProduct: CompetitorProduct): KnowledgeEntry {
    return {
      id: this.generateEntryId(competitorProduct),
      competitorSku: competitorProduct.sku,
      competitorCompany: competitorProduct.company,
      confirmedSpecs: { ...competitorProduct.specifications },
      alternativeNames: competitorProduct.model ? [competitorProduct.model] : [],
      equivalentModels: [],
      sourceUrls: [],
      lastResearched: new Date(),
      researchCount: 0,
      reliability: 0.1, // Start with low reliability
      tags: this.generateInitialTags(competitorProduct)
    };
  }

  private updateEntryWithResearch(entry: KnowledgeEntry, researchResult: ProductResearchResult): void {
    // Update specifications with research findings
    Object.assign(entry.confirmedSpecs, researchResult.enhancedSpecs);

    // Add source URLs
    const newUrls = researchResult.searchResults.map(r => r.url);
    entry.sourceUrls.push(...newUrls);
    entry.sourceUrls = [...new Set(entry.sourceUrls)]; // Deduplicate

    // Update research metadata
    entry.lastResearched = new Date();
    entry.researchCount++;

    // Add suggested matches as potential equivalents
    for (const match of researchResult.suggestedMatches) {
      const existing = entry.equivalentModels.find(m => m.ourSku === match.ourSku);
      if (!existing) {
        entry.equivalentModels.push({
          ourSku: match.ourSku,
          ourModel: match.ourProduct.model,
          confidence: match.confidence,
          verifiedBy: 'research',
          verifiedAt: new Date(),
          notes: match.reasoning.join('; ')
        });
      }
    }

    // Update tags based on research
    const researchTags = this.extractTagsFromResearch(researchResult);
    entry.tags.push(...researchTags);
    entry.tags = [...new Set(entry.tags)]; // Deduplicate
  }

  private updateVerifiedMatches(entry: KnowledgeEntry, matches: MatchResult[], verifiedBy: 'research' | 'manual' | 'ai'): void {
    for (const match of matches) {
      const existingIndex = entry.equivalentModels.findIndex(m => m.ourSku === match.ourSku);
      
      if (existingIndex >= 0) {
        // Update existing match
        entry.equivalentModels[existingIndex] = {
          ...entry.equivalentModels[existingIndex],
          confidence: match.confidence,
          verifiedBy,
          verifiedAt: new Date(),
          notes: match.reasoning.join('; ')
        };
      } else {
        // Add new verified match
        entry.equivalentModels.push({
          ourSku: match.ourSku,
          ourModel: match.ourProduct.model,
          confidence: match.confidence,
          verifiedBy,
          verifiedAt: new Date(),
          notes: match.reasoning.join('; ')
        });
      }
    }
  }

  private calculateReliability(entry: KnowledgeEntry, researchResult: ProductResearchResult): number {
    let reliability = entry.reliability;

    // Factor 1: Research quality
    const researchConfidence = researchResult.confidence;
    reliability += researchConfidence * 0.1;

    // Factor 2: Source quality
    const manufacturerSources = researchResult.searchResults.filter(r => r.source === 'manufacturer').length;
    reliability += Math.min(manufacturerSources / 3, 1) * 0.1;

    // Factor 3: Specification completeness
    const specCount = Object.keys(entry.confirmedSpecs).length;
    reliability += Math.min(specCount / 8, 1) * 0.1;

    // Factor 4: Verification status
    const verifiedMatches = entry.equivalentModels.filter(m => m.verifiedBy === 'manual').length;
    reliability += Math.min(verifiedMatches / 2, 1) * 0.2;

    return Math.min(reliability, 1.0);
  }

  private async extractLearningPatterns(
    competitorProduct: CompetitorProduct,
    researchResult: ProductResearchResult
  ): Promise<void> {
    // Pattern 1: Brand family relationships
    const brandPattern = this.extractBrandFamilyPattern(competitorProduct, researchResult);
    if (brandPattern) {
      await this.updateLearningPattern(brandPattern);
    }

    // Pattern 2: Model naming conventions
    const modelPatterns = this.extractModelNamingPatterns(competitorProduct, researchResult);
    for (const pattern of modelPatterns) {
      await this.updateLearningPattern(pattern);
    }

    // Pattern 3: Specification correlations
    const specPatterns = this.extractSpecificationPatterns(competitorProduct, researchResult);
    for (const pattern of specPatterns) {
      await this.updateLearningPattern(pattern);
    }
  }

  private extractBrandFamilyPattern(
    competitorProduct: CompetitorProduct,
    researchResult: ProductResearchResult
  ): LearningPattern | null {
    // Look for cross-references to other brands in research results
    const mentionedBrands = new Set<string>();
    
    for (const result of researchResult.searchResults) {
      const text = `${result.title} ${result.snippet}`.toLowerCase();
      const brandMentions = text.match(/\b(trane|carrier|bryant|lennox|goodman|rheem|york)\b/g);
      if (brandMentions) {
        brandMentions.forEach(brand => mentionedBrands.add(brand));
      }
    }

    if (mentionedBrands.size > 1) {
      const pattern = Array.from(mentionedBrands).sort().join('-');
      return {
        pattern: `brand_family:${pattern}`,
        category: 'brand_family',
        confidence: researchResult.confidence,
        occurrences: 1,
        lastSeen: new Date(),
        examples: [`${competitorProduct.company} -> ${Array.from(mentionedBrands).join(', ')}`]
      };
    }

    return null;
  }

  private extractModelNamingPatterns(
    competitorProduct: CompetitorProduct,
    researchResult: ProductResearchResult
  ): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    
    if (!competitorProduct.model) return patterns;

    // Extract model number structure patterns
    const model = competitorProduct.model.toUpperCase();
    const structurePattern = model.replace(/\d/g, 'N').replace(/[A-Z]/g, 'L');
    
    patterns.push({
      pattern: `model_structure:${structurePattern}`,
      category: 'model_naming',
      confidence: 0.7,
      occurrences: 1,
      lastSeen: new Date(),
      examples: [model]
    });

    return patterns;
  }

  private extractSpecificationPatterns(
    competitorProduct: CompetitorProduct,
    researchResult: ProductResearchResult
  ): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    const specs = researchResult.enhancedSpecs;

    // Look for specification embedding in SKU/model
    if (specs.tonnage && competitorProduct.sku) {
      const tonnageCode = Math.round(specs.tonnage * 12).toString(); // Convert to BTU thousands
      if (competitorProduct.sku.includes(tonnageCode)) {
        patterns.push({
          pattern: `tonnage_in_sku:${tonnageCode}`,
          category: 'spec_correlation',
          confidence: 0.8,
          occurrences: 1,
          lastSeen: new Date(),
          examples: [`${competitorProduct.sku} contains ${tonnageCode} for ${specs.tonnage} ton`]
        });
      }
    }

    return patterns;
  }

  private async updateLearningPattern(pattern: LearningPattern): Promise<void> {
    const existing = this.learningPatterns.get(pattern.pattern);
    
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = new Date();
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
      existing.examples.push(...pattern.examples);
      existing.examples = existing.examples.slice(-10); // Keep only recent examples
    } else {
      this.learningPatterns.set(pattern.pattern, pattern);
    }
  }

  private generateInitialTags(competitorProduct: CompetitorProduct): string[] {
    const tags: string[] = [];
    
    // Add company tag
    tags.push(`company:${competitorProduct.company.toLowerCase().replace(/\s+/g, '_')}`);
    
    // Add product type tags based on description
    if (competitorProduct.description) {
      const desc = competitorProduct.description.toLowerCase();
      if (desc.includes('furnace')) tags.push('type:furnace');
      if (desc.includes('heat pump')) tags.push('type:heat_pump');
      if (desc.includes('air condition')) tags.push('type:air_conditioner');
      if (desc.includes('coil')) tags.push('type:coil');
    }

    return tags;
  }

  private extractTagsFromResearch(researchResult: ProductResearchResult): string[] {
    const tags: string[] = [];
    
    // Add source quality tags
    const manufacturerSources = researchResult.searchResults.filter(r => r.source === 'manufacturer').length;
    if (manufacturerSources > 0) tags.push('quality:manufacturer_verified');
    
    // Add specification completeness tags
    const specCount = Object.keys(researchResult.enhancedSpecs).length;
    if (specCount >= 4) tags.push('specs:complete');
    else if (specCount >= 2) tags.push('specs:partial');
    
    return tags;
  }

  // Suggestion methods (simplified for brevity)
  private async getBrandFamilySuggestions(
    competitorProduct: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<Array<{ suggestion: MatchResult; reasoning: string; confidence: number }>> {
    // Implementation would use learned brand family patterns
    return [];
  }

  private async getModelPatternSuggestions(
    competitorProduct: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<Array<{ suggestion: MatchResult; reasoning: string; confidence: number }>> {
    // Implementation would use learned model naming patterns
    return [];
  }

  private async getSpecificationSuggestions(
    competitorProduct: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<Array<{ suggestion: MatchResult; reasoning: string; confidence: number }>> {
    // Implementation would use learned specification correlations
    return [];
  }

  private async getCrossReferenceSuggestions(
    competitorProduct: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<Array<{ suggestion: MatchResult; reasoning: string; confidence: number }>> {
    // Implementation would use historical cross-reference data
    return [];
  }

  private extractSuccessPatterns(
    competitorProduct: CompetitorProduct,
    ourProduct: OurProduct,
    matchMethod: string
  ): LearningPattern[] {
    // Implementation would extract patterns from successful matches
    return [];
  }

  private async reinforceLearningPattern(pattern: LearningPattern, confidence: number): Promise<void> {
    // Implementation would reinforce successful patterns
  }

  private async findSimilarEntries(competitorProduct: CompetitorProduct): Promise<KnowledgeEntry | undefined> {
    // Implementation would find similar entries using fuzzy matching
    return undefined;
  }

  private async persistKnowledgeEntry(entry: KnowledgeEntry): Promise<void> {
    // Implementation would save to database
    console.log(`Persisting knowledge entry: ${entry.id}`);
  }

  private async loadKnowledgeEntry(entryId: string): Promise<KnowledgeEntry | undefined> {
    // Implementation would load from database
    return undefined;
  }
}