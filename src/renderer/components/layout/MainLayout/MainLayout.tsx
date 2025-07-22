import React, { useState } from 'react';
import { Header } from '../Header';
import { Sidebar } from '../Sidebar';
import { PageContainer, PageId } from '../../pages/PageContainer';
import './MainLayout.css';

interface MainLayoutProps {
  initialPage?: PageId;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  initialPage = 'dashboard' 
}) => {
  const [currentPage, setCurrentPage] = useState<PageId>(initialPage);

  const handlePageChange = (pageId: string) => {
    setCurrentPage(pageId as PageId);
  };

  return (
    <div className="main-layout">
      <Header />
      
      <div className="layout-body">
        <Sidebar 
          activeItem={currentPage}
          onItemSelect={handlePageChange}
        />
        
        <main className="main-content">
          <div className="content-container">
            <PageContainer currentPage={currentPage} />
          </div>
        </main>
      </div>
    </div>
  );
};