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

export const Database: React.FC = () => {
  const [records, setRecords] = useState<CrosswalkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<keyof CrosswalkRecord>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Mock crosswalk data for now - in Phase 2 this will connect to actual database
  useEffect(() => {
    const mockData: CrosswalkRecord[] = [
      {
        id: 1,
        competitor_sku: 'TRN-XR16-024-230',
        competitor_company: 'Trane',
        competitor_price: 2850.00,
        competitor_price_date: '2024-01-15',
        our_sku: 'LEN-XC16-024-230',
        our_model: 'XC16-024-230',
        confidence: 0.95,
        match_method: 'exact_model',
        verified: true,
        verified_by: 'John Smith',
        verified_at: '2024-01-15T14:30:00Z',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T14:30:00Z'
      },
      {
        id: 2,
        competitor_sku: 'CAR-25HCB636A003',
        competitor_company: 'Carrier',
        competitor_price: 3200.00,
        competitor_price_date: '2024-01-16',
        our_sku: 'LEN-XP16-036-230',
        our_model: 'XP16-036-230',
        confidence: 0.87,
        match_method: 'ai_specs',
        verified: false,
        notes: 'Similar tonnage and SEER, needs verification',
        created_at: '2024-01-16T09:15:00Z'
      },
      {
        id: 3,
        competitor_sku: 'YRK-YP9C100B32UP13',
        competitor_company: 'York',
        competitor_price: 1450.00,
        competitor_price_date: '2024-01-17',
        our_sku: 'LEN-SL280-080',
        our_model: 'SL280-080',
        confidence: 0.72,
        match_method: 'ai_fuzzy',
        verified: false,
        notes: 'Low confidence match - review manually',
        created_at: '2024-01-17T11:20:00Z'
      }
    ];
    
    setTimeout(() => {
      setRecords(mockData);
      setLoading(false);
    }, 500);
  }, []);

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

  const handleCellSave = () => {
    if (!editingCell) return;
    
    setRecords(prev => prev.map(record => {
      if (record.id === editingCell.rowId) {
        const updatedRecord = {
          ...record,
          [editingCell.field]: editValue,
          updated_at: new Date().toISOString()
        };
        return updatedRecord;
      }
      return record;
    }));
    
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

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    
    if (confirm(`Delete ${selectedRows.size} selected record(s)?`)) {
      setRecords(prev => prev.filter(record => !selectedRows.has(record.id)));
      setSelectedRows(new Set());
    }
  };

  const handlePurgeDatabase = () => {
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
          setRecords([]);
          setSelectedRows(new Set());
          alert('Database has been purged. All crosswalk records have been deleted.');
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