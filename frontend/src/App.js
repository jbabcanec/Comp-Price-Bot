import React, { useState } from 'react';
import { Layout, Menu, Typography, ConfigProvider } from 'antd';
import {
  FileSearchOutlined,
  UploadOutlined,
  HistoryOutlined,
  DashboardOutlined,
  SettingOutlined
} from '@ant-design/icons';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import SearchInterface from './components/SearchInterface';
import MatchHistory from './components/MatchHistory';
import Settings from './components/Settings';
import './App.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('upload');

  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'upload':
        return <FileUpload />;
      case 'search':
        return <SearchInterface />;
      case 'history':
        return <MatchHistory />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            background: 'white',
            boxShadow: '2px 0 8px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Title level={4} style={{ margin: 0, color: '#6366f1' }}>
              {collapsed ? 'CPB' : 'CompPrice Bot'}
            </Title>
          </div>
          <Menu
            theme="light"
            selectedKeys={[selectedMenu]}
            mode="inline"
            onClick={({ key }) => setSelectedMenu(key)}
            items={[
              {
                key: 'upload',
                icon: <UploadOutlined />,
                label: 'Upload Files',
              },
              {
                key: 'search',
                icon: <FileSearchOutlined />,
                label: 'Search & Match',
              },
              {
                key: 'history',
                icon: <HistoryOutlined />,
                label: 'Match History',
              },
              {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard',
              },
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Settings',
              },
            ]}
          />
        </Sider>
        <Layout>
          <Header style={{ 
            background: 'white', 
            padding: '0 24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Title level={3} style={{ margin: 0 }}>
              HVAC Competitive Pricing Intelligence
            </Title>
          </Header>
          <Content style={{ margin: '24px' }}>
            {renderContent()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;