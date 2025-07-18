import React, { useState } from 'react';
import { Card, Input, Button, Switch, Typography, Space, List, Tag, Spin, Empty, Alert } from 'antd';
import { SearchOutlined, GlobalOutlined, FileSearchOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

function SearchInterface() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchWeb, setSearchWeb] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setSearching(true);
    setResults([]);

    try {
      const response = await apiService.searchCompetitor(searchQuery, searchWeb);

      if (response.data.success) {
        setResults(response.data.results);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 0.8) return 'green';
    if (confidence > 0.6) return 'orange';
    return 'red';
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Search & Match Competitors</Title>

      <Card className="glass-morphism" style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div>
            <Title level={4}>Enter Competitor Information</Title>
            <TextArea
              rows={4}
              placeholder="Enter competitor product details, SKU, model number, or specifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 16 }}
            />
          </div>

          <Space size="large">
            <Space>
              <GlobalOutlined />
              <Text>Search Web</Text>
              <Switch
                checked={searchWeb}
                onChange={setSearchWeb}
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </Space>
            
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={searching}
              size="large"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                height: 'auto',
                padding: '10px 30px'
              }}
            >
              Search & Match
            </Button>
          </Space>

          {searchWeb && (
            <Alert
              message="Web Search Enabled"
              description="The system will search online for competitor information and attempt to match with our products."
              type="info"
              showIcon
            />
          )}
        </Space>
      </Card>

      {searching && (
        <Card className="glass-morphism" style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Title level={4} style={{ marginTop: 20 }}>
            Analyzing competitor data...
          </Title>
          <Text type="secondary">
            Using AI to find the best matches in our catalog
          </Text>
        </Card>
      )}

      {!searching && results.length > 0 && (
        <Card title="Search Results" className="glass-morphism">
          <List
            dataSource={results}
            renderItem={(item, index) => (
              <List.Item
                className="match-card"
                style={{ 
                  padding: 20, 
                  marginBottom: 16, 
                  background: 'white',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0'
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </div>
                  }
                  title={
                    <Space>
                      <FileSearchOutlined />
                      <Text strong>
                        {item.type === 'local_match' ? 'Local Database Match' : 'Web Search Result'}
                      </Text>
                      <Tag color={getConfidenceColor(item.confidence)}>
                        {(item.confidence * 100).toFixed(0)}% Confidence
                      </Tag>
                    </Space>
                  }
                  description={
                    <div style={{ marginTop: 8 }}>
                      <Paragraph ellipsis={{ rows: 3, expandable: true }}>
                        {typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2)}
                      </Paragraph>
                      {item.matched_product && (
                        <div style={{ marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                          <Text strong>Matched Product: </Text>
                          <Text>{item.matched_product}</Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {!searching && results.length === 0 && searchQuery && (
        <Empty
          description={
            <Space direction="vertical">
              <Text>No results found</Text>
              <Text type="secondary">Try adjusting your search query or enabling web search</Text>
            </Space>
          }
        />
      )}
    </div>
  );
}

export default SearchInterface;