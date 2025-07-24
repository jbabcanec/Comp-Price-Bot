import React from 'react';

interface IconComponentProps {
  name: string;
  size?: number;
  className?: string;
}

export const IconComponent: React.FC<IconComponentProps> = ({ 
  name, 
  size = 20, 
  className = '' 
}) => {
  const getIconPath = (iconName: string) => {
    const icons: Record<string, string> = {
      // Dashboard and navigation icons
      chart: "M3 3v18h18M8 12l4-4 4 4 6-6",
      folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
      upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
      shuffle: "M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5",
      clock: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67V7z",
      settings: "M12 15.5A3.5 3.5 0 018.5 12A3.5 3.5 0 0112 8.5a3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-3.5 3.5zM19.43 12.97c.04-.32.07-.64.07-.97s-.03-.66-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65c-.03-.24-.24-.42-.49-.42h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.63c-.04.32-.07.65-.07.97s.03.66.07.97l-2.11 1.63c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.63z",
      database: "M12 2C8.14 2 5 3.343 5 5v14c0 1.657 3.14 3 7 3s7-1.343 7-3V5c0-1.657-3.14-3-7-3zM5 9v2c0 1.657 3.14 3 7 3s7-1.343 7-3V9M5 15v2c0 1.657 3.14 3 7 3s7-1.343 7-3v-2",
      
      // Better icons for dashboard actions
      reports: "M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.25h-15A2.25 2.25 0 012.25 17V4.75A2.25 2.25 0 014.5 2.5h15A2.25 2.25 0 0121.75 4.75V17a2.25 2.25 0 01-2.25 2.25z",
      file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 2v16h12V9h-5V2H6z",
      
      // Additional utility icons
      plus: "M12 5v14M5 12h14",
      minus: "M5 12h14",
      check: "M20 6L9 17l-5-5",
      x: "M18 6L6 18M6 6l12 12",
      refresh: "M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4a9 9 0 01-14.85 3.36L23 14",
      search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
      filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
      download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
    };
    return icons[iconName] || icons.chart;
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      className={className}
    >
      <path 
        d={getIconPath(name)} 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
};