import React, { useState } from 'react';
import './Sidebar.css';

const IconComponent: React.FC<{ name: string; size?: number }> = ({ name, size = 20 }) => {
  const getIconPath = (iconName: string) => {
    const icons: Record<string, string> = {
      chart: "M3 3v18h18M8 12l4-4 4 4 6-6",
      folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
      upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
      shuffle: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
      clock: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67V7z",
      settings: "M12 15.5A3.5 3.5 0 018.5 12A3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5zM19.43 12.97c.04-.32.07-.64.07-.97s-.03-.66-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65c-.03-.24-.24-.42-.49-.42h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.63c-.04.32-.07.65-.07.97s.03.66.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63z",
      database: "M12 2C8.14 2 5 3.343 5 5v14c0 1.657 3.14 3 7 3s7-1.343 7-3V5c0-1.657-3.14-3-7-3zM5 9v2c0 1.657 3.14 3 7 3s7-1.343 7-3V9M5 15v2c0 1.657 3.14 3 7 3s7-1.343 7-3v-2"
    };
    return icons[iconName] || icons.chart;
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={getIconPath(name)} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

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