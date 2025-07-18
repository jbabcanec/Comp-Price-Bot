import React, { useState, useEffect } from 'react';
import { Upload, Card, Typography, message, Button, List, Tag, DatePicker, Space, Progress, Empty, Alert, Spin, Collapse } from 'antd';
import { InboxOutlined, CloudUploadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, CalendarOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Panel } = Collapse;

function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [customTimestamp, setCustomTimestamp] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useCustomTimestamp, setUseCustomTimestamp] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking');
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const response = await apiService.checkHealth();
      if (response.data.status === 'healthy') {
        setSystemStatus('ready');
        setConnectionError(null);
      } else if (response.data.status === 'degraded') {
        setSystemStatus('error');
        setConnectionError(response.data.message || 'System not fully configured');
      } else {
        setSystemStatus('error');
        setConnectionError('System not responding properly');
      }
    } catch (error) {
      setSystemStatus('error');
      setConnectionError('Cannot connect to backend. Please make sure the server is running.');
    }
  };

  const handleUpload = async (file) => {
    if (systemStatus !== 'ready') {
      message.error('System is not ready. Please check the connection.');
      return false;
    }

    setUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Only add timestamp if user chose to use custom timestamp
    if (useCustomTimestamp && customTimestamp) {
      formData.append('timestamp', customTimestamp.toISOString());
    }

    try {
      const response = await apiService.uploadFile(formData, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });

      if (response.data.success) {
        message.success(`${file.name} processed successfully!`);
        setUploadResults([...uploadResults, {
          filename: file.name,
          matches: response.data.matches,
          timestamp: response.data.timestamp,
          status: 'success'
        }]);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      message.error(`Failed to process ${file.name}: ${errorMessage}`);
      setUploadResults([...uploadResults, {
        filename: file.name,
        matches: [],
        timestamp: moment().toISOString(),
        status: 'error',
        error: errorMessage
      }]);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }

    return false; // Prevent default upload behavior
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    beforeUpload: handleUpload,
    accept: '.pdf,.doc,.docx,.txt,.json,.jpg,.jpeg,.png,.eml,.msg',
    disabled: systemStatus !== 'ready' || uploading,
  };

  const renderSystemStatus = () => {
    switch (systemStatus) {
      case 'checking':
        return (
          <Alert
            message="Checking System Status"
            description={
              <Space>
                <Spin size="small" />
                <Text>Verifying connection to AI agents...</Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        );
      case 'error':
        return (
          <Alert
            message="System Not Ready"
            description={
              <Space direction="vertical">
                <Text>{connectionError}</Text>
                {connectionError && connectionError.includes('API key') && (
                  <Text type="secondary">
                    Please configure your OpenAI API key in the Settings tab to enable file processing.
                  </Text>
                )}
                <Button size="small" onClick={checkSystemStatus}>
                  Retry Connection
                </Button>
              </Space>
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        );
      case 'ready':
        return (
          <Alert
            message="System Ready"
            description="AI agents are online and ready to process your files"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        <CloudUploadOutlined style={{ marginRight: 8 }} />
        Upload Competitor Data
      </Title>
      
      {renderSystemStatus()}
      
      <Card className="glass-morphism" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Collapse ghost>
            <Panel 
              header={
                <Space>
                  <CalendarOutlined />
                  <Text strong>Timestamp Settings (Optional)</Text>
                </Space>
              } 
              key="timestamp"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Button 
                    type={useCustomTimestamp ? 'primary' : 'default'}
                    onClick={() => setUseCustomTimestamp(!useCustomTimestamp)}
                    icon={<CalendarOutlined />}
                  >
                    {useCustomTimestamp ? 'Using Custom Timestamp' : 'Use Current Time'}
                  </Button>
                </div>
                
                {useCustomTimestamp && (
                  <div>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                      Select when this competitive data was captured:
                    </Text>
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      placeholder="Select date and time"
                      onChange={(date) => setCustomTimestamp(date)}
                      value={customTimestamp}
                    />
                  </div>
                )}
              </Space>
            </Panel>
          </Collapse>
          
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ 
                fontSize: 48, 
                color: systemStatus === 'ready' ? '#6366f1' : '#d9d9d9' 
              }} />
            </p>
            <p className="ant-upload-text">
              {systemStatus === 'ready' 
                ? 'Click or drag files to upload' 
                : 'System not ready - please wait'
              }
            </p>
            <p className="ant-upload-hint">
              {systemStatus === 'ready' 
                ? 'Support for PDFs, Word docs, images, emails, and more. Files will be analyzed using AI to find matching products.'
                : 'Please configure your API key in Settings to enable file processing.'
              }
            </p>
          </Dragger>

          {uploading && (
            <div>
              <Progress 
                percent={uploadProgress} 
                status="active"
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                <Spin size="small" style={{ marginRight: 8 }} />
                Processing with AI agents...
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {uploadResults.length > 0 ? (
        <Card title="Upload Results" className="glass-morphism">
          <List
            dataSource={uploadResults}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <div style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      background: item.status === 'success' ? '#f6ffed' : '#fff2f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${item.status === 'success' ? '#52c41a' : '#ff4d4f'}`
                    }}>
                      {item.status === 'success' ? (
                        <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                      ) : (
                        <ExclamationCircleOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />
                      )}
                    </div>
                  }
                  title={
                    <Space>
                      <Text strong>{item.filename}</Text>
                      <Tag color={item.status === 'success' ? 'green' : 'red'}>
                        {item.status === 'success' ? 'Processed' : 'Failed'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text type="secondary">
                        {item.status === 'success' ? 'Processed' : 'Failed'} at: {moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                      
                      {item.status === 'success' && (
                        <Space wrap>
                          {item.matches.map((match, idx) => (
                            <Tag 
                              key={idx}
                              color={match.confidence > 0.8 ? 'green' : match.confidence > 0.6 ? 'orange' : 'red'}
                            >
                              {match.our_product_id}: {(match.confidence * 100).toFixed(0)}%
                            </Tag>
                          ))}
                          {item.matches.length === 0 && (
                            <Tag color="default" icon={<InfoCircleOutlined />}>
                              No matches found
                            </Tag>
                          )}
                        </Space>
                      )}
                      
                      {item.status === 'error' && (
                        <Alert
                          message="Processing Error"
                          description={item.error}
                          type="error"
                          showIcon
                          size="small"
                          style={{ marginTop: 8 }}
                        />
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      ) : systemStatus === 'ready' ? (
        <Card className="glass-morphism">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text type="secondary">Ready to process files</Text>
                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                  Upload competitor files above to get started with AI-powered product matching
                </Paragraph>
              </Space>
            }
          />
        </Card>
      ) : null}
    </div>
  );
}

export default FileUpload;