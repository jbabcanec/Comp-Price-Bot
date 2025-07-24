import React from 'react';
import { Dashboard } from './Dashboard';
import { Products } from './Products';
import { Upload } from './Upload';
import { Database } from './Database';
import { History } from './History';
import { Settings } from './Settings';

export type PageId = 'dashboard' | 'products' | 'upload' | 'database' | 'history' | 'settings';

interface PageContainerProps {
  currentPage: PageId;
  onNavigate?: (pageId: string) => void;
}

export const PageContainer: React.FC<PageContainerProps> = ({ currentPage, onNavigate }) => {
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={onNavigate} />;
      case 'products':
        return <Products />;
      case 'upload':
        return <Upload />;
      case 'database':
        return <Database />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="page-container">
      {renderPage()}
    </div>
  );
};