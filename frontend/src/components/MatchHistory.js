import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Typography, Tag, Button, Space, Input, DatePicker, Modal, Descriptions } from 'antd';
import { SearchOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { apiService } from '../services/api';
import moment from 'moment';

const { Title } = Typography;
const { RangePicker } = DatePicker;

function MatchHistory() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    dateRange: null
  });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getMatches(pagination.current, pagination.pageSize);
      
      setMatches(response.data.matches);
      setPagination({
        ...pagination,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const showDetails = (record) => {
    setSelectedMatch(record);
    setDetailsVisible(true);
  };

  const exportData = () => {
    const csvContent = [
      ['ID', 'Product ID', 'Confidence', 'Source File', 'Timestamp'],
      ...matches.map(m => [
        m.id,
        m.our_product_id,
        m.confidence_score,
        m.source_file,
        m.timestamp
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `match_history_${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Our Product',
      dataIndex: 'our_product_id',
      key: 'our_product_id',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence_score',
      key: 'confidence_score',
      render: (score) => {
        const percentage = (score * 100).toFixed(0);
        let color = 'green';
        if (score < 0.8) color = 'orange';
        if (score < 0.6) color = 'red';
        
        return (
          <Tag color={color} style={{ fontWeight: 'bold' }}>
            {percentage}%
          </Tag>
        );
      },
      sorter: (a, b) => a.confidence_score - b.confidence_score,
    },
    {
      title: 'Source File',
      dataIndex: 'source_file',
      key: 'source_file',
      ellipsis: true,
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm'),
      sorter: (a, b) => moment(a.timestamp).unix() - moment(b.timestamp).unix(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => showDetails(record)}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Match History</Title>

      <Card className="glass-morphism" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
          <Input
            placeholder="Search matches..."
            prefix={<SearchOutlined />}
            style={{ width: 300 }}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          
          <RangePicker
            style={{ width: 300 }}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />
          
          <Button type="primary" onClick={fetchMatches}>
            Apply Filters
          </Button>
          
          <Button 
            icon={<DownloadOutlined />}
            onClick={exportData}
          >
            Export CSV
          </Button>
        </Space>
      </Card>

      <Card className="glass-morphism">
        <Table
          columns={columns}
          dataSource={matches}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} matches`,
            onChange: (page, pageSize) => {
              setPagination({
                ...pagination,
                current: page,
                pageSize
              });
            }
          }}
        />
      </Card>

      <Modal
        title="Match Details"
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        width={800}
      >
        {selectedMatch && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Match ID">{selectedMatch.id}</Descriptions.Item>
            <Descriptions.Item label="Our Product ID">
              <Tag color="blue">{selectedMatch.our_product_id}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Confidence Score">
              <Tag color={selectedMatch.confidence_score > 0.8 ? 'green' : 'orange'}>
                {(selectedMatch.confidence_score * 100).toFixed(2)}%
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Source File">{selectedMatch.source_file}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {moment(selectedMatch.timestamp).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="Competitor Data">
              <pre style={{ maxHeight: 300, overflow: 'auto' }}>
                {JSON.stringify(selectedMatch.competitor_data, null, 2)}
              </pre>
            </Descriptions.Item>
            {selectedMatch.notes && (
              <Descriptions.Item label="Notes">{selectedMatch.notes}</Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

export default MatchHistory;