import React, { useState, useEffect } from 'react';
import './Database.css';

interface CrosswalkRecord {
  id: number;
  competitor_sku: string;
  competitor_company: string;
  competitor_price?: number;
  competitor_price_date?: string;
  our_sku: string;
  our_model: string;
  confidence: number;
  match_method: string;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

interface EditingCell {
  rowId: number;
  field: string;
}

/**
 * Database page component for managing SKU crosswalk mappings.
 * Displays and manages the relationship between competitor SKUs and our equivalent products.
 * 
 * Features:
 * - View all crosswalk mapping records
 * - Edit mapping details inline
 * - Delete individual or multiple mappings
 * - Export mappings to CSV
 * - Complete database purge with confirmation
 * - Sort and search functionality
 */
export const Database: React.FC = () => {
  const [records, setRecords] = useState<CrosswalkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<keyof CrosswalkRecord>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Load real crosswalk data from database
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await window.electronAPI.database.mappings.findAll();
      if (response.success) {
        // Convert database format to display format
        const mappedRecords: CrosswalkRecord[] = (response.data || []).map((mapping: any) => ({
          id: mapping.id,
          competitor_sku: mapping.competitor_sku,
          competitor_company: mapping.competitor_company,
          competitor_price: mapping.competitor_price,
          competitor_price_date: mapping.competitor_price_date,
          our_sku: mapping.our_sku,
          our_model: mapping.our_model,
          confidence: mapping.confidence,
          match_method: mapping.match_method,
          verified: mapping.verified,
          verified_by: mapping.verified_by,
          verified_at: mapping.verified_at,
          notes: mapping.notes,
          created_at: mapping.created_at,
          updated_at: mapping.updated_at
        }));
        setRecords(mappedRecords);
      } else {
        console.error('Failed to load mappings:', response.error);
        setRecords([]);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof CrosswalkRecord) => {
    const direction = field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);
    
    const sorted = [...records].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return direction === 'asc' ? 1 : -1;
      if (bVal === undefined) return direction === 'asc' ? -1 : 1;
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    setRecords(sorted);
  };

  const handleCellClick = (rowId: number, field: string, currentValue: any) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue?.toString() || '');
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    
    try {
      const updateData = {
        id: editingCell.rowId,
        [editingCell.field]: editValue
      };
      
      const response = await window.electronAPI.database.mappings.update(updateData);
      
      if (response.success) {
        // Update the local records state
        setRecords(prev => prev.map(record => {
          if (record.id === editingCell.rowId) {
            return {
              ...record,
              [editingCell.field]: editValue,
              updated_at: new Date().toISOString()
            };
          }
          return record;
        }));
      } else {
        console.error('Failed to update record:', response.error);
        alert('Failed to update record: ' + (response.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating record:', error);
      alert('Error updating record: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const toggleRowSelection = (id: number) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllRows = () => {
    if (selectedRows.size === records.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(records.map(r => r.id)));
    }
  };

  const deleteSelectedRows = async () => {
    if (selectedRows.size === 0) return;
    
    if (confirm(`Delete ${selectedRows.size} selected record(s)?`)) {
      try {
        const deletePromises = Array.from(selectedRows).map(id =>
          window.electronAPI.database.mappings.delete(id)
        );
        
        const results = await Promise.all(deletePromises);
        const failedDeletes = results.filter((result: any) => !result.success);
        
        if (failedDeletes.length > 0) {
          console.error('Some deletes failed:', failedDeletes);
          alert(`Failed to delete ${failedDeletes.length} record(s). Check console for details.`);
        }
        
        // Remove successfully deleted records from local state
        setRecords(prev => prev.filter(record => !selectedRows.has(record.id)));
        setSelectedRows(new Set());
        
        if (failedDeletes.length === 0) {
          alert(`Successfully deleted ${selectedRows.size} record(s).`);
        }
      } catch (error) {
        console.error('Error deleting records:', error);
        alert('Error deleting records: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handlePurgeDatabase = async () => {
    if (records.length === 0) return;
    
    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete ALL ${records.length} crosswalk records from the database.\n\nThis action cannot be undone. Are you absolutely sure you want to purge all data?`
    );
    
    if (confirmed) {
      const doubleConfirmed = confirm(
        `Last chance: This will delete ALL ${records.length} records permanently.\n\nType YES in the next dialog to confirm.`
      );
      
      if (doubleConfirmed) {
        const finalConfirmation = prompt('Type "DELETE ALL" to confirm purging the entire database:');
        if (finalConfirmation === 'DELETE ALL') {
          try {
            const response = await window.electronAPI.invoke('db:purgeAllData');
            
            if (response.success) {
              setRecords([]);
              setSelectedRows(new Set());
              const { totalDeleted, breakdown } = response.data;
              alert(
                `Database has been purged successfully!\n\n` +
                `Total records deleted: ${totalDeleted}\n` +
                `• History: ${breakdown.history}\n` +
                `• Mappings: ${breakdown.mappings}\n` +
                `• Competitor Data: ${breakdown.competitorData}\n` +
                `• Products: ${breakdown.products}`
              );
            } else {
              console.error('Failed to purge database:', response.error);
              alert('Failed to purge database: ' + response.error.message);
            }
          } catch (error) {
            console.error('Error purging database:', error);
            alert('Error purging database: ' + (error instanceof Error ? error.message : 'Unknown error'));
          }
        } else {
          alert('Purge cancelled - confirmation text did not match.');
        }
      }
    }
  };


  const handleExportToCSV = () => {
    if (records.length === 0) {
      alert('No records to export.');
      return;
    }

    try {
      // Create CSV content
      const headers = [
        'ID',
        'Competitor SKU',
        'Competitor Company',
        'Competitor Price',
        'Price Date',
        'Our SKU',
        'Our Model',
        'Confidence',
        'Match Method',
        'Verified',
        'Verified By',
        'Verified At',
        'Notes',
        'Created At',
        'Updated At'
      ];

      // Convert records to CSV format
      const csvRows = records.map(record => [
        record.id,
        `"${record.competitor_sku}"`,
        `"${record.competitor_company}"`,
        record.competitor_price || '',
        record.competitor_price_date || '',
        `"${record.our_sku}"`,
        `"${record.our_model}"`,
        record.confidence,
        `"${record.match_method}"`,
        record.verified ? 'Yes' : 'No',
        record.verified_by ? `"${record.verified_by}"` : '',
        record.verified_at ? `"${formatDate(record.verified_at)}"` : '',
        record.notes ? `"${record.notes.replace(/"/g, '""')}"` : '',
        `"${formatDate(record.created_at)}"`,
        record.updated_at ? `"${formatDate(record.updated_at)}"` : ''
      ]);

      // Combine headers and data
      const csvContent = [headers, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `hvac-crosswalk-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert(`Successfully exported ${records.length} records to CSV file.`);
      } else {
        alert('CSV export is not supported in this browser.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString();
  };

  const renderCell = (record: CrosswalkRecord, field: keyof CrosswalkRecord) => {
    const isEditing = editingCell?.rowId === record.id && editingCell?.field === field;
    const value = record[field];
    
    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellSave}
          onKeyDown={handleKeyPress}
          className="cell-input"
          autoFocus
        />
      );
    }
    
    let displayValue = value;
    
    if (field.includes('_at') && value) {
      displayValue = formatDate(value as string);
    } else if (field === 'competitor_price' && typeof value === 'number') {
      displayValue = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    } else if (field === 'competitor_price_date' && value) {
      displayValue = new Date(value as string).toLocaleDateString();
    } else if (field === 'confidence' && typeof value === 'number') {
      displayValue = `${Math.round(value * 100)}%`;
    } else if (field === 'verified' && typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    }
    
    const getConfidenceColor = (confidence: number) => {
      if (confidence >= 0.9) return '#059669'; // green
      if (confidence >= 0.8) return '#d97706'; // orange  
      return '#dc2626'; // red
    };
    
    const cellStyle = field === 'confidence' && typeof value === 'number' 
      ? { backgroundColor: getConfidenceColor(value) + '20', color: getConfidenceColor(value) }
      : {};
    
    return (
      <span 
        className="cell-content"
        style={cellStyle}
        onClick={() => handleCellClick(record.id, field, value)}
        title="Click to edit"
      >
        {displayValue || '-'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="database-page">
        <div className="page-header">
          <h1>SKU Crosswalk Database</h1>
          <p>Loading crosswalk mappings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="database-page">
      <div className="page-header">
        <h1>SKU Crosswalk Database</h1>
        <p>View and edit competitor SKU mappings with pricing data</p>
      </div>

      <div className="database-toolbar">
        <div className="toolbar-left">
          <button 
            className="btn btn-secondary"
            onClick={selectAllRows}
          >
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {selectedRows.size === records.length ? 'Deselect All' : 'Select All'}
          </button>
          
          {selectedRows.size > 0 && (
            <button 
              className="btn btn-danger"
              onClick={deleteSelectedRows}
            >
              <div className="btn-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              Delete Selected ({selectedRows.size})
            </button>
          )}
        </div>
        
        <div className="toolbar-right">
          <span className="record-count">{records.length} records</span>
          <button 
            className="btn btn-primary"
            onClick={handleExportToCSV}
            disabled={records.length === 0}
          >
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Export CSV
          </button>
          <button 
            className="btn btn-danger"
            onClick={handlePurgeDatabase}
            disabled={records.length === 0}
          >
            <div className="btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            Purge All Data
          </button>
        </div>
      </div>

      <div className="database-table-container">
        <table className="database-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input 
                  type="checkbox"
                  checked={selectedRows.size === records.length && records.length > 0}
                  onChange={selectAllRows}
                />
              </th>
              {[
                { key: 'id', label: 'ID' },
                { key: 'competitor_sku', label: 'Competitor SKU' },
                { key: 'competitor_company', label: 'Company' },
                { key: 'competitor_price', label: 'Price' },
                { key: 'competitor_price_date', label: 'Price Date' },
                { key: 'our_sku', label: 'Our SKU' },
                { key: 'our_model', label: 'Our Model' },
                { key: 'confidence', label: 'Confidence' },
                { key: 'match_method', label: 'Method' },
                { key: 'verified', label: 'Verified' },
                { key: 'verified_by', label: 'Verified By' },
                { key: 'notes', label: 'Notes' },
                { key: 'created_at', label: 'Created' },
                { key: 'updated_at', label: 'Updated' }
              ].map(({ key, label }) => (
                <th 
                  key={key}
                  className={`sortable-header ${sortField === key ? 'sorted' : ''}`}
                  onClick={() => handleSort(key as keyof CrosswalkRecord)}
                >
                  <div className="header-content">
                    <span>{label}</span>
                    <div className="sort-indicator">
                      {sortField === key && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path 
                            d={sortDirection === 'asc' ? 'M7 14l5-5 5 5' : 'M7 10l5 5 5-5'} 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr 
                key={record.id}
                className={selectedRows.has(record.id) ? 'selected' : ''}
              >
                <td className="checkbox-column">
                  <input 
                    type="checkbox"
                    checked={selectedRows.has(record.id)}
                    onChange={() => toggleRowSelection(record.id)}
                  />
                </td>
                <td className="id-column">{record.id}</td>
                <td>{renderCell(record, 'competitor_sku')}</td>
                <td>{renderCell(record, 'competitor_company')}</td>
                <td className="price-column">{renderCell(record, 'competitor_price')}</td>
                <td className="date-column">{renderCell(record, 'competitor_price_date')}</td>
                <td>{renderCell(record, 'our_sku')}</td>
                <td>{renderCell(record, 'our_model')}</td>
                <td className="confidence-column">{renderCell(record, 'confidence')}</td>
                <td>{renderCell(record, 'match_method')}</td>
                <td className="verified-column">{renderCell(record, 'verified')}</td>
                <td>{renderCell(record, 'verified_by')}</td>
                <td className="notes-column">{renderCell(record, 'notes')}</td>
                <td className="timestamp-column">{renderCell(record, 'created_at')}</td>
                <td className="timestamp-column">{renderCell(record, 'updated_at')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};