import React, { useState } from 'react';
import { IconComponent } from '../../shared/IconComponent';
import './Sidebar.css';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarProps {
  activeItem?: string;
  onItemSelect?: (itemId: string) => void;
  collapsed?: boolean;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'chart' },
  { id: 'products', label: 'Our Files', icon: 'folder' },
  { id: 'upload', label: 'Competitor Data', icon: 'upload' },
  { id: 'database', label: 'SKU Database', icon: 'database' },
  { id: 'history', label: 'History', icon: 'clock' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeItem = 'dashboard', 
  onItemSelect,
  collapsed = false 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleItemClick = (itemId: string) => {
    if (onItemSelect) {
      onItemSelect(itemId);
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button 
          className="collapse-button" 
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {sidebarItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
                onClick={() => handleItemClick(item.id)}
                title={isCollapsed ? item.label : ''}
              >
                <span className="nav-icon">
                  <IconComponent name={item.icon} size={18} />
                </span>
                {!isCollapsed && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className={`status-indicator ${isCollapsed ? 'collapsed' : ''}`}>
          <div className="status-dot online"></div>
          {!isCollapsed && (
            <div className="status-text">
              <span className="status-label">Database</span>
              <span className="status-value">Connected</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};