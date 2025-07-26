import React, { useState, useRef } from 'react';
import './Upload.css';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'matching';
  progress?: number;
  extractedData?: any[];
  error?: string;
  matchingResults?: MatchingResults;
}

interface MatchingResults {
  matched: number;
  noMatch: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  processingTime: number;
}

export const Upload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedFilesSectionRef = useRef<HTMLDivElement>(null);

  const supportedFormats = {
    'Spreadsheets': ['.xlsx', '.xls', '.csv', '.ods'],
    'Documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    'Images': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'],
    'Email': ['.msg', '.eml', '.mbox'],
    'Other': ['.json', '.xml', '.html', '.zip', '.rar']
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    
    if (['xlsx', 'xls', 'csv', 'ods'].includes(ext!)) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
          <line x1="16" y1="13" x2="8" y2="21" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="13" x2="16" y2="21" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    }
    
    if (['pdf'].includes(ext!)) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
          <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    }
    
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext!)) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
          <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    }
    
    if (['msg', 'eml', 'mbox'].includes(ext!)) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
          <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    }
    
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
      </svg>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const processFile = async (file: File): Promise<void> => {
    const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const uploadedFile: UploadedFile = {
      id: fileId,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'processing',
      progress: 0
    };
    
    setUploadedFiles(prev => [...prev, uploadedFile]);
    
    // Auto-scroll to uploaded files section after a short delay
    setTimeout(() => {
      if (uploadedFilesSectionRef.current) {
        uploadedFilesSectionRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
    }, 100);
    
    try {
      // Save file temporarily for processing
      const tempFilePath = await saveFileTemporarily(file);
      
      // Update progress to show file saved
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 20 } : f
      ));
      
      // Process file using real FileProcessorService
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.file?.process) {
        throw new Error('File processing not available');
      }
      
      // Update progress
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 40 } : f
      ));
      
      const result = await electronAPI.file.process(tempFilePath);
      
      // Update progress
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 80 } : f
      ));
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Processing failed');
      }
      
      // Clean up temporary file
      try {
        await fetch(`file://${tempFilePath}`).then(() => {
          // File cleanup would happen here in a real implementation
        });
      } catch {
        // Ignore cleanup errors
      }
      
      // Transform the data to match our UI format
      const extractedData = result.data.data.map((item: any) => ({
        sku: item.sku,
        company: item.company,
        price: item.price,
        description: item.description || item.source
      }));

      // Save competitor data to database automatically
      try {
        const competitorDataList = extractedData.map((item: any) => ({
          sku: item.sku || '',
          company: item.company || 'Unknown',
          price: item.price,
          description: item.description,
          source_file: file.name
        })).filter((item: any) => item.sku); // Filter out items without SKU

        if (competitorDataList.length > 0) {
          const dbResult = await electronAPI.database.competitorData.bulkCreate(competitorDataList);
          console.log(`Saved ${dbResult.data || 0} competitor products to database from ${file.name}`);
        }
      } catch (dbError) {
        console.warn('Failed to save competitor data:', dbError);
        // Don't fail the whole process if database save fails
      }
      
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'completed', 
              progress: 100, 
              extractedData,
              processingTime: result.data.processingTime 
            }
          : f
      ));
      
    } catch (error) {
      console.error('File processing error:', error);
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Failed to process file' 
            }
          : f
      ));
    }
  };

  /**
   * Save file temporarily for processing by main process
   */
  const saveFileTemporarily = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Create a temporary file path
        const tempPath = `/tmp/hvac_upload_${Date.now()}_${file.name}`;
        
        // In a real implementation, we'd write this to a temp directory
        // For now, we'll use the file path directly if available
        if ((file as any).path) {
          resolve((file as any).path);
        } else {
          // This would need to be handled by an IPC call to write the file
          resolve(tempPath);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const generateMockExtractedData = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    
    if (['xlsx', 'xls', 'csv'].includes(ext!)) {
      return [
        { sku: 'TRN-XR16-036-230', company: 'Trane', price: 3200.00, description: '3 Ton AC Unit 16 SEER' },
        { sku: 'CAR-25HCB636A003', company: 'Carrier', price: 3350.00, description: '3 Ton Heat Pump' },
      ];
    } else if (ext === 'pdf') {
      return [
        { sku: 'YRK-YP9C100B32UP13', company: 'York', price: 1450.00, description: '80% AFUE Furnace' },
      ];
    } else if (['jpg', 'png'].includes(ext!)) {
      return [
        { sku: 'GDM-GSZ140361KB', company: 'Goodman', price: 2850.00, description: 'Extracted from price sheet image' },
      ];
    } else if (ext === 'msg') {
      return [
        { sku: 'RHM-RP1536AJ1NA', company: 'Rheem', price: 2950.00, description: 'From email price quote' },
      ];
    }
    
    return [{ sku: 'UNKNOWN', company: 'Unknown', price: 0, description: 'File processed successfully' }];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  const startCrosswalkMatching = async (fileId: string, extractedData: any[]) => {
    try {
      // Set file status to matching
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'matching' } : f
      ));

      const electronAPI = (window as any).electronAPI;
      
      // Debug logging
      console.log('=== CROSSWALK DEBUGGING ===');
      console.log('electronAPI available:', !!electronAPI);
      console.log('electronAPI.crosswalk available:', !!electronAPI?.crosswalk);
      console.log('electronAPI.crosswalk.match available:', !!electronAPI?.crosswalk?.match);
      console.log('electronAPI keys:', electronAPI ? Object.keys(electronAPI) : 'no electronAPI');
      if (electronAPI?.crosswalk) {
        console.log('crosswalk keys:', Object.keys(electronAPI.crosswalk));
      }
      console.log('========================');
      
      // Convert extracted data to competitor products format
      const competitorProducts = extractedData.map(item => ({
        sku: item.sku || '',
        company: item.company || '',
        price: item.price,
        model: item.model,
        description: item.description,
        source: 'file_upload'
      }));

      console.log('Starting crosswalk matching for:', competitorProducts);
      
      // Call the crosswalk matching IPC handler
      const result = await electronAPI.crosswalk.match(competitorProducts);
      
      if (result.success) {
        // Update file with matching results
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? { 
            ...f, 
            status: 'completed',
            matchingResults: {
              matched: result.stats.matched,
              noMatch: result.stats.noMatch,
              highConfidence: result.stats.highConfidence,
              mediumConfidence: result.stats.mediumConfidence,
              lowConfidence: result.stats.lowConfidence,
              processingTime: result.processingTime
            }
          } : f
        ));
        
        alert(`Crosswalk matching completed!\n\n` +
              `✅ Matched: ${result.stats.matched}\n` +
              `❌ No match: ${result.stats.noMatch}\n` +
              `🎯 High confidence: ${result.stats.highConfidence}\n` +
              `🔍 Medium confidence: ${result.stats.mediumConfidence}\n` +
              `⚠️ Low confidence: ${result.stats.lowConfidence}\n\n` +
              `Processing time: ${(result.processingTime / 1000).toFixed(1)}s\n\n` +
              `Results saved to database and history.`);
      } else {
        throw new Error(result.error || 'Matching failed');
      }
      
    } catch (error) {
      console.error('Crosswalk matching failed:', error);
      
      // Set file status back to completed with error
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Matching failed' } : f
      ));
      
      alert(`Crosswalk matching failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your settings and try again.`);
    }
  };
  return (
    <div className="upload-page">
      <div className="page-header">
        <h1>Competitor Data</h1>
        <p>Upload any file type - we'll extract SKU, pricing, and product information using AI</p>
      </div>

      <div className="upload-content">
        <div className="upload-area">
          <div 
            className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drop-zone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Drop files here or click to browse</h3>
            <p>We accept literally anything - PDFs, images, emails, spreadsheets, Word docs, etc.</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="*/*"
            />
            <button 
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              Choose Files
            </button>
          </div>
        </div>

        <div className="file-types-grid">
          <h3>Supported File Types</h3>
          <div className="file-types">
            {Object.entries(supportedFormats).map(([category, extensions]) => (
              <div key={category} className="file-type-category">
                <h4>{category}</h4>
                <div className="extensions">
                  {extensions.map(ext => (
                    <span key={ext} className="extension-tag">{ext}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-section" ref={uploadedFilesSectionRef}>
            <div className="section-header">
              <h3>Uploaded Files ({uploadedFiles.length})</h3>
              <button className="btn btn-secondary" onClick={clearAll}>
                Clear All
              </button>
            </div>
            
            <div className="uploaded-files-list">
              {uploadedFiles.map(file => (
                <div key={file.id} className={`file-item ${file.status}`}>
                  <div className="file-icon">
                    {getFileIcon(file.name)}
                  </div>
                  
                  <div className="file-info">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <span className="file-status">{file.status}</span>
                      {file.progress !== undefined && file.status === 'processing' && (
                        <span className="file-progress">{Math.round(file.progress)}%</span>
                      )}
                    </div>
                    
                    {file.status === 'processing' && (
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${file.progress || 0}%` }}
                        />
                      </div>
                    )}
                    
                    {file.status === 'matching' && (
                      <div className="matching-progress">
                        <div className="spinner"></div>
                        <span>Running crosswalk matching...</span>
                      </div>
                    )}
                    
                    {file.status === 'completed' && file.extractedData && !file.matchingResults && (
                      <div className="extracted-data">
                        <h5>Extracted Data ({file.extractedData.length} items):</h5>
                        <div className="data-preview">
                          {file.extractedData.slice(0, 3).map((item, index) => (
                            <div key={index} className="data-item">
                              <strong>{item.sku}</strong> - {item.company} - ${item.price?.toFixed(2)} - {item.description}
                            </div>
                          ))}
                          {file.extractedData.length > 3 && (
                            <div className="data-item more">
                              +{file.extractedData.length - 3} more items...
                            </div>
                          )}
                        </div>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => startCrosswalkMatching(file.id, file.extractedData || [])}
                        >
                          Start Crosswalk Matching
                        </button>
                      </div>
                    )}
                    
                    {file.status === 'completed' && file.matchingResults && (
                      <div className="matching-results">
                        <h5>🎯 Crosswalk Matching Complete!</h5>
                        <div className="results-summary">
                          <div className="result-item success">✅ Matched: {file.matchingResults.matched}</div>
                          <div className="result-item error">❌ No match: {file.matchingResults.noMatch}</div>
                          <div className="result-item high">🎯 High confidence: {file.matchingResults.highConfidence}</div>
                          <div className="result-item medium">🔍 Medium confidence: {file.matchingResults.mediumConfidence}</div>
                          <div className="result-item low">⚠️ Low confidence: {file.matchingResults.lowConfidence}</div>
                        </div>
                        <div className="processing-time">
                          Processing time: {(file.matchingResults.processingTime / 1000).toFixed(1)}s
                        </div>
                        <div className="results-note">
                          ✅ Results saved to database and history
                        </div>
                      </div>
                    )}
                    
                    {file.status === 'error' && (
                      <div className="error-message">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                          <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        {file.error}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    className="remove-file"
                    onClick={() => removeFile(file.id)}
                    title="Remove file"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="upload-instructions">
          <h3>How It Works</h3>
          <div className="instructions-grid">
            <div className="instruction-item">
              <span className="instruction-icon">1</span>
              <div>
                <h4>Upload Anything</h4>
                <p>Drop ANY file type - price sheets, photos, emails, PDFs. Our AI will figure it out.</p>
              </div>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">2</span>
              <div>
                <h4>AI Processing</h4>
                <p>Advanced OCR + AI extracts SKU, company, pricing from images, documents, emails.</p>
              </div>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">3</span>
              <div>
                <h4>Smart Matching</h4>
                <p>Automatically matches competitor products to your catalog using AI and specifications.</p>
              </div>
            </div>
            <div className="instruction-item">
              <span className="instruction-icon">4</span>
              <div>
                <h4>Review & Save</h4>
                <p>Review matches, make corrections, and save to your crosswalk database.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};