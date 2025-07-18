import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, List, Tag, Empty, Spin, Alert, Button, Space } from 'antd';
import {
  FileSearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/api';

const { Title, Text, Paragraph } = Typography;

function Dashboard() {
  const [stats, setStats] = useState({
    totalMatches: 0,
    todayMatches: 0,
    avgConfidence: 0,
    pendingReviews: 0
  });
  const [recentMatches, setRecentMatches] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getMatches(1, 5);
      setRecentMatches(response.data.matches);
      
      // Calculate stats from actual data
      const totalMatches = response.data.total;
      const matches = response.data.matches;
      
      // Calculate average confidence
      const avgConfidence = matches.length > 0 
        ? matches.reduce((sum, match) => sum + match.confidence_score, 0) / matches.length
        : 0;
      
      // Calculate today's matches
      const today = new Date().toDateString();
      const todayMatches = matches.filter(match => 
        new Date(match.timestamp).toDateString() === today
      ).length;
      
      setStats({
        totalMatches: totalMatches,
        todayMatches: todayMatches,
        avgConfidence: avgConfidence,
        pendingReviews: matches.filter(match => match.confidence_score < 0.8).length
      });

      // Generate chart data based on actual data or defaults
      if (matches.length > 0) {
        const chartData = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
          const dayMatches = matches.filter(match => 
            new Date(match.timestamp).toDateString() === date.toDateString()
          ).length;
          
          return {
            day: dayName,
            matches: dayMatches
          };
        });
        setChartData(chartData);
      } else {
        // Show empty chart for new installations
        setChartData([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        <Spin size="large" />
        <Title level={3} style={{ marginTop: 20 }}>
          Loading Dashboard...
        </Title>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Title level={2} style={{ marginBottom: 24 }}>Dashboard Overview</Title>
        <Alert
          message="Error Loading Dashboard"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={fetchDashboardData} icon={<ReloadOutlined />}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Dashboard Overview</Title>
      
      {stats.totalMatches === 0 ? (
        <Card className="glass-morphism">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text type="secondary">No data available yet</Text>
                <Paragraph type="secondary" style={{ fontSize: 12 }}>
                  Process competitor files to start seeing analytics and insights
                </Paragraph>
              </Space>
            }
          />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Total Matches"
                  value={stats.totalMatches}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#6366f1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Today's Matches"
                  value={stats.todayMatches}
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Avg Confidence"
                  value={stats.avgConfidence}
                  precision={1}
                  suffix="%"
                  prefix={<FileSearchOutlined />}
                  valueStyle={{ color: '#faad14' }}
                  formatter={(value) => `${(value * 100).toFixed(1)}`}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="Pending Reviews"
                  value={stats.pendingReviews}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={16}>
              <Card title="Weekly Match Trends" className="glass-morphism">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="matches" 
                        stroke="#6366f1" 
                        strokeWidth={3}
                        dot={{ fill: '#6366f1', r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No trend data available yet"
                    />
                  </div>
                )}
              </Card>
            </Col>
            
            <Col xs={24} lg={8}>
              <Card title="Recent Matches" className="glass-morphism">
                {recentMatches.length > 0 ? (
                  <List
                    dataSource={recentMatches}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <Text ellipsis style={{ maxWidth: 200 }}>
                              {item.source_file || 'Unknown Source'}
                            </Text>
                          }
                          description={
                            <div>
                              <Tag color={item.confidence_score > 0.8 ? 'green' : 'orange'}>
                                {(item.confidence_score * 100).toFixed(0)}% Match
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(item.timestamp).toLocaleDateString()}
                              </Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No recent matches"
                  />
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}

export default Dashboard;