import pytest
import json
from app import app, db
from models import CompetitorMatch

@pytest.fixture
def client():
    """Create a test client"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client

def test_health_check(client):
    """Test health check endpoint"""
    response = client.get('/api/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'status' in data
    assert 'api_key_configured' in data

def test_upload_without_file(client):
    """Test upload endpoint without file"""
    response = client.post('/api/upload')
    assert response.status_code in [400, 503]  # 503 if API key not configured

def test_search_without_query(client):
    """Test search endpoint without query"""
    response = client.post('/api/search', 
                         json={},
                         content_type='application/json')
    assert response.status_code in [400, 503]

def test_get_matches(client):
    """Test get matches endpoint"""
    response = client.get('/api/matches')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'matches' in data
    assert 'total' in data
    assert 'page' in data
    assert 'pages' in data

def test_agents_status(client):
    """Test agents status endpoint"""
    response = client.get('/api/agents/status')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'success' in data
    assert 'agents' in data
    assert 'system_status' in data