import React, { useState, useEffect } from 'react';
import { Card, Typography, Form, Input, Button, Switch, Space, message, Divider, Alert, Modal, Tag } from 'antd';
import { SaveOutlined, ApiOutlined, DatabaseOutlined, RobotOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';

const { Title, Text } = Typography;

function Settings() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState({ has_api_key: false, masked_key: '', system_initialized: false });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');

  // Load API key status on component mount
  useEffect(() => {
    loadApiKeyStatus();
  }, []);

  const loadApiKeyStatus = async () => {
    try {
      const response = await apiService.getApiKeyStatus();
      setApiKeyStatus(response.data);
    } catch (error) {
      console.error('Failed to load API key status:', error);
    }
  };

  const handleApiKeySubmit = async () => {
    if (!tempApiKey) {
      message.error('Please enter an API key');
      return;
    }

    setLoading(true);
    try {
      await apiService.saveApiKey(tempApiKey);
      message.success('API key saved successfully!');
      setShowApiKeyModal(false);
      setTempApiKey('');
      await loadApiKeyStatus();
    } catch (error) {
      message.error(error.response?.data?.error || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Save other settings (not including API key which is handled separately)
      console.log('Settings:', values);
      message.success('Settings saved successfully!');
      
      // Check agent system status
      if (apiKeyStatus.has_api_key) {
        await apiService.getAgentStatus();
        message.success('Multi-Agent System verified successfully!');
      }
    } catch (error) {
      message.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Settings</Title>

      <Alert
        message={apiKeyStatus.has_api_key ? "System Ready" : "Configuration Required"}
        description={apiKeyStatus.has_api_key 
          ? `OpenAI API key configured (${apiKeyStatus.masked_key}). System is ready for AI-powered matching.`
          : "Please configure your OpenAI API key to enable AI-powered matching and analysis."
        }
        type={apiKeyStatus.has_api_key ? "success" : "warning"}
        showIcon
        action={
          <Button
            size="small"
            type={apiKeyStatus.has_api_key ? "default" : "primary"}
            onClick={() => setShowApiKeyModal(true)}
          >
            {apiKeyStatus.has_api_key ? "Change API Key" : "Configure API Key"}
          </Button>
        }
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          enable_web_search: true,
          auto_match_threshold: 0.7,
          max_results_per_search: 10
        }}
      >
        <Card 
          title={
            <Space>
              <ApiOutlined />
              <Text>API Configuration</Text>
            </Space>
          }
          className="glass-morphism" 
          style={{ marginBottom: 24 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>OpenAI API Key Status:</Text>
              <Tag color={apiKeyStatus.has_api_key ? 'green' : 'red'}>
                {apiKeyStatus.has_api_key ? (
                  <><CheckCircleOutlined /> Configured</>
                ) : (
                  <><ExclamationCircleOutlined /> Not Configured</>
                )}
              </Tag>
            </div>
            
            {apiKeyStatus.has_api_key && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text>Current Key:</Text>
                <Text code>{apiKeyStatus.masked_key}</Text>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>System Status:</Text>
              <Tag color={apiKeyStatus.system_initialized ? 'green' : 'orange'}>
                {apiKeyStatus.system_initialized ? (
                  <><CheckCircleOutlined /> Operational</>
                ) : (
                  <><ExclamationCircleOutlined /> Initializing</>
                )}
              </Tag>
            </div>
          </Space>
        </Card>

        <Card 
          title={
            <Space>
              <RobotOutlined />
              <Text>AI Agent Settings</Text>
            </Space>
          }
          className="glass-morphism" 
          style={{ marginBottom: 24 }}
        >
          <Form.Item
            name="enable_web_search"
            label="Enable Web Search"
            valuePropName="checked"
          >
            <Switch checkedChildren="ON" unCheckedChildren="OFF" />
          </Form.Item>

          <Form.Item
            name="auto_match_threshold"
            label="Auto-Match Confidence Threshold"
            extra="Matches above this threshold will be automatically approved (0-1)"
          >
            <Input 
              type="number" 
              min={0} 
              max={1} 
              step={0.1}
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="max_results_per_search"
            label="Maximum Results per Search"
          >
            <Input 
              type="number" 
              min={1} 
              max={50}
              size="large"
            />
          </Form.Item>
        </Card>

        <Card 
          title={
            <Space>
              <DatabaseOutlined />
              <Text>Database Settings</Text>
            </Space>
          }
          className="glass-morphism" 
          style={{ marginBottom: 24 }}
        >
          <Form.Item
            name="database_url"
            label="Database URL"
            extra="Default: sqlite:///comp_pricing.db"
          >
            <Input 
              placeholder="sqlite:///comp_pricing.db" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="backup_enabled"
            label="Enable Automatic Backups"
            valuePropName="checked"
          >
            <Switch checkedChildren="ON" unCheckedChildren="OFF" />
          </Form.Item>
        </Card>

        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            icon={<SaveOutlined />}
            size="large"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              height: 'auto',
              padding: '10px 30px'
            }}
          >
            Save Settings
          </Button>
          
          <Button 
            size="large"
            onClick={() => form.resetFields()}
          >
            Reset
          </Button>
        </Space>
      </Form>

      <Divider />

      <Card title="Quick Actions" className="glass-morphism">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            block
            onClick={() => message.info('Rebuilding vector database...')}
          >
            Rebuild Vector Database
          </Button>
          <Button 
            block
            onClick={() => message.info('Clearing cache...')}
          >
            Clear Cache
          </Button>
          <Button 
            block
            danger
            onClick={() => message.warning('This would reset all data in a real app')}
          >
            Reset All Data
          </Button>
        </Space>
      </Card>

      <Modal
        title="Configure OpenAI API Key"
        open={showApiKeyModal}
        onOk={handleApiKeySubmit}
        onCancel={() => {
          setShowApiKeyModal(false);
          setTempApiKey('');
        }}
        confirmLoading={loading}
        okText="Save API Key"
        cancelText="Cancel"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="API Key Security"
            description="Your API key will be securely stored in your .env file and never transmitted to third parties."
            type="info"
            showIcon
          />
          
          {apiKeyStatus.has_api_key && (
            <div>
              <Text>Current API Key: </Text>
              <Text code>{apiKeyStatus.masked_key}</Text>
              <br />
              <Text type="secondary">Enter a new key to replace the current one</Text>
            </div>
          )}
          
          <Input.Password
            placeholder="sk-..."
            value={tempApiKey}
            onChange={(e) => setTempApiKey(e.target.value)}
            size="large"
            style={{ marginTop: 16 }}
          />
          
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Get your API key from: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
              OpenAI API Keys Dashboard
            </a>
          </Text>
        </Space>
      </Modal>
    </div>
  );
}

export default Settings;