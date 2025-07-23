import React, { useState, useEffect } from 'react';
import './Products.css';

interface ProductFile {
  name: string;
  path: string;
  extension: string;
  isSupported: boolean;
  selected: boolean;
  size?: number;
}

interface ImportedProduct {
  id?: number;
  sku: string;
  model: string;
  brand: string;
  type: 'air_conditioner' | 'heat_pump' | 'furnace' | 'coil' | 'other';
  tonnage?: number;
  seer?: number;
  seer2?: number;
  afue?: number;
  hspf?: number;
  refrigerant?: string;
  stage?: 'single' | 'two-stage' | 'variable';
  description?: string;
  msrp?: number;
  category?: string;
  subcategory?: string;
  created_at?: string;
}

interface ValidationError {
  row: number;
  sku: string;
  errors: string[];
}

interface ImportSummary {
  totalProcessed: number;
  validProducts: number;
  invalidProducts: number;
  duplicateSkus: number;
  warnings: number;
  products: ImportedProduct[];
  errors: ValidationError[];
}

type ViewMode = 'import' | 'table';

export const Products: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('import');
  const [selectedDirectory, setSelectedDirectory] = useState<string>('');
  const [productFiles, setProductFiles] = useState<ProductFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof ImportedProduct>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showDetails, setShowDetails] = useState<number | null>(null);

  const handleSelectDirectory = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.file?.select) {
        throw new Error('File selection not available');
      }

      const result = await electronAPI.file.select({
        title: 'Select Directory with Your Product Files',
        properties: ['openDirectory']
      });

      if (!result.success || !result.data) {
        return;
      }

      const directoryPath = result.data;
      setSelectedDirectory(directoryPath);
      await loadDirectoryFiles(directoryPath);
    } catch (error) {
      console.error('Directory selection failed:', error);
      alert('Failed to select directory: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const loadDirectoryFiles = async (directoryPath: string) => {
    setLoading(true);
    try {
      const electronAPI = (window as any).electronAPI;
      const result = await electronAPI.file.scanDirectory(directoryPath);

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to scan directory');
      }

      const files: ProductFile[] = result.data.map((file: any) => ({
        ...file,
        selected: file.isSupported // Auto-select supported files
      }));

      setProductFiles(files);
    } catch (error) {
      console.error('Failed to load directory files:', error);
      alert('Failed to load directory files: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileToggle = (filePath: string) => {
    setProductFiles(prev => prev.map(file => 
      file.path === filePath 
        ? { ...file, selected: !file.selected }
        : file
    ));
  };

  const handleSelectAll = () => {
    const supportedFiles = productFiles.filter(f => f.isSupported);
    const allSupportedSelected = supportedFiles.every(f => f.selected);
    
    setProductFiles(prev => prev.map(file => 
      file.isSupported 
        ? { ...file, selected: !allSupportedSelected }
        : file
    ));
  };

  const handleRefresh = async () => {
    if (selectedDirectory) {
      await loadDirectoryFiles(selectedDirectory);
    }
  };

  // Load existing products from database
  useEffect(() => {
    loadExistingProducts();
  }, []);

  const loadExistingProducts = async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      const result = await electronAPI.database.products.findAll();
      
      if (result.success) {
        setImportedProducts(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load existing products:', error);
    }
  };

  const handleProcessSelected = async () => {
    const selectedFiles = productFiles.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to process');
      return;
    }

    setProcessing(true);
    try {
      const electronAPI = (window as any).electronAPI;
      const filePaths = selectedFiles.map(f => f.path);
      
      const result = await electronAPI.file.processBatch(filePaths);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Batch processing failed');
      }

      // Process results with validation
      const processedData = result.data;
      const extractedProducts = processedData.flatMap((fileResult: any) => 
        fileResult.success ? fileResult.data : []
      );

      // Validate products using ProductValidatorService
      const validationResult = await electronAPI.file.validateProducts(extractedProducts);
      
      if (!validationResult.success) {
        throw new Error('Product validation failed');
      }

      const summary: ImportSummary = validationResult.data;
      setImportSummary(summary);

      // If we have valid products, store them in database
      if (summary.validProducts > 0) {
        const dbResult = await electronAPI.database.products.bulkCreate(summary.products);
        
        if (dbResult.success) {
          // Refresh the product list
          await loadExistingProducts();
          setViewMode('table');
        }
      }

      // Show results summary
      alert(`Import complete!\nTotal processed: ${summary.totalProcessed}\nValid products: ${summary.validProducts}\nInvalid products: ${summary.invalidProducts}\nDuplicates: ${summary.duplicateSkus}\nWarnings: ${summary.warnings}`);
      
    } catch (error) {
      console.error('Import processing failed:', error);
      alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const getFileIcon = (extension: string) => {
    switch (extension) {
      case '.csv':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 12l4-4 4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case '.xlsx':
      case '.xls':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="8" y1="13" x2="16" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case '.json':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case '.txt':
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  const handleSort = (field: keyof ImportedProduct) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const electronAPI = (window as any).electronAPI;
      const result = await electronAPI.database.products.delete(id);
      
      if (result.success) {
        await loadExistingProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Filter and sort products
  const filteredProducts = importedProducts
    .filter(product => 
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const selectedCount = productFiles.filter(f => f.selected).length;
  const supportedCount = productFiles.filter(f => f.isSupported).length;
  
  return (
    <div className="products-page">
      <div className="page-header">
        <h1>Product Management</h1>
        <p>Import and manage YOUR HVAC product catalog</p>
      </div>

      <div className="page-actions">
        <button 
          className={`btn ${viewMode === 'import' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setViewMode('import')}
        >
          Import Products
        </button>
        <button 
          className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setViewMode('table')}
          disabled={importedProducts.length === 0}
        >
          View Products ({importedProducts.length})
        </button>
      </div>

      {viewMode === 'import' && !selectedDirectory && (
        <div className="upload-area">
          <div className="drop-zone">
            <div className="drop-zone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Select Your Product Directory</h3>
            <p>Choose a directory containing your HVAC product files (CSV, Excel, JSON, TXT)</p>
            <button className="btn btn-primary" onClick={handleSelectDirectory} disabled={loading}>
              <div className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {loading ? 'Loading...' : 'Choose Directory'}
            </button>
          </div>
        </div>
      )}

      {viewMode === 'import' && selectedDirectory && (
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 073.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Refresh Files
          </button>
          
          <button className="btn btn-secondary" onClick={handleSelectAll} disabled={loading || supportedCount === 0}>
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Select All ({supportedCount})
          </button>

          <button 
            className="btn btn-success" 
            onClick={handleProcessSelected} 
            disabled={loading || processing || selectedCount === 0}
          >
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {processing ? 'Processing...' : `Process Selected (${selectedCount})`}
          </button>
        </div>
      )}

      <div className="products-content">
        {viewMode === 'import' ? (
          // Import Mode
          selectedDirectory ? (
            <div className="files-section">
              <div className="directory-info">
                <h3>Import Directory</h3>
                <p className="directory-path">{selectedDirectory}</p>
                <div className="files-stats">
                  <span className="stat">
                    <strong>{productFiles.length}</strong> total files
                  </span>
                  <span className="stat">
                    <strong>{supportedCount}</strong> supported
                  </span>
                  <span className="stat">
                    <strong>{selectedCount}</strong> selected
                  </span>
                </div>
              </div>

              {importSummary && (
                <div className="import-summary">
                  <h3>Last Import Summary</h3>
                  <div className="summary-stats">
                    <span className="stat success">
                      <strong>{importSummary.validProducts}</strong> valid products imported
                    </span>
                    <span className="stat error">
                      <strong>{importSummary.invalidProducts}</strong> invalid products
                    </span>
                    <span className="stat warning">
                      <strong>{importSummary.duplicateSkus}</strong> duplicates
                    </span>
                    <span className="stat warning">
                      <strong>{importSummary.warnings}</strong> warnings
                    </span>
                  </div>
                </div>
              )}

              {productFiles.length === 0 ? (
                <div className="no-files">
                  <p>No files found in this directory.</p>
                </div>
              ) : (
                <div className="files-list">
                  {productFiles.map((file) => (
                    <div 
                      key={file.path} 
                      className={`file-item ${file.isSupported ? 'supported' : 'unsupported'} ${file.selected ? 'selected' : ''}`}
                    >
                      <div className="file-checkbox">
                        <input
                          type="checkbox"
                          checked={file.selected}
                          onChange={() => handleFileToggle(file.path)}
                          disabled={!file.isSupported}
                        />
                      </div>
                      
                      <div className="file-icon">
                        {getFileIcon(file.extension)}
                      </div>
                      
                      <div className="file-info">
                        <div className="file-name">{file.name}</div>
                        <div className="file-details">
                          <span className="file-extension">{file.extension}</span>
                          {file.size && (
                            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                          )}
                          <span className={`file-status ${file.isSupported ? 'supported' : 'unsupported'}`}>
                            {file.isSupported ? 'Supported' : 'Not Supported'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null
        ) : (
          // Table Mode
          <div className="products-table-section">
            <div className="table-controls">
              <div className="search-controls">
                <input
                  type="text"
                  placeholder="Search by SKU, Brand, or Model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <span className="results-count">
                  {filteredProducts.length} of {importedProducts.length} products
                </span>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="no-products">
                <p>{importedProducts.length === 0 ? 'No products imported yet.' : 'No products match your search.'}</p>
              </div>
            ) : (
              <div className="products-table-container">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort('sku')} className="sortable">
                        SKU {sortField === 'sku' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('brand')} className="sortable">
                        Brand {sortField === 'brand' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('model')} className="sortable">
                        Model {sortField === 'model' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th onClick={() => handleSort('type')} className="sortable">
                        Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th>Specs</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <React.Fragment key={product.id}>
                        <tr className="product-row">
                          <td className="sku-cell">
                            <strong>{product.sku}</strong>
                          </td>
                          <td>{product.brand}</td>
                          <td>{product.model}</td>
                          <td>
                            <span className={`type-badge type-${product.type}`}>
                              {product.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="specs-cell">
                            {product.tonnage && <span className="spec">Tonnage: {product.tonnage}</span>}
                            {product.seer && <span className="spec">SEER: {product.seer}</span>}
                            {product.afue && <span className="spec">AFUE: {product.afue}%</span>}
                          </td>
                          <td className="actions-cell">
                            <button 
                              className="btn-small btn-secondary"
                              onClick={() => setShowDetails(showDetails === product.id ? null : product.id!)}
                            >
                              {showDetails === product.id ? 'Hide' : 'Details'}
                            </button>
                            <button 
                              className="btn-small btn-danger"
                              onClick={() => handleDeleteProduct(product.id!)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                        {showDetails === product.id && (
                          <tr className="product-details-row">
                            <td colSpan={6}>
                              <div className="product-details">
                                <div className="detail-section">
                                  <h4>Technical Specifications</h4>
                                  <div className="detail-grid">
                                    <div className="detail-item">
                                      <span className="label">Tonnage:</span>
                                      <span className="value">{product.tonnage || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="label">SEER:</span>
                                      <span className="value">{product.seer || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="label">SEER2:</span>
                                      <span className="value">{product.seer2 || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="label">AFUE:</span>
                                      <span className="value">{product.afue ? `${product.afue}%` : 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="label">HSPF:</span>
                                      <span className="value">{product.hspf || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="label">Refrigerant:</span>
                                      <span className="value">{product.refrigerant || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="label">Stage:</span>
                                      <span className="value">{product.stage || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                      <span className="label">MSRP:</span>
                                      <span className="value">{product.msrp ? `$${product.msrp.toLocaleString()}` : 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                {product.description && (
                                  <div className="detail-section">
                                    <h4>Description</h4>
                                    <p>{product.description}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};