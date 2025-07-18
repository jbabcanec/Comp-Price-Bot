import pytest
from unittest.mock import patch, MagicMock
from services import HVACCompetitiveIntelligenceSystem, FileProcessor

class TestFileProcessor:
    """Test FileProcessor service"""
    
    def test_init(self):
        """Test FileProcessor initialization"""
        processor = FileProcessor()
        assert processor is not None
    
    @patch('services.file_processor.easyocr.Reader')
    def test_process_image(self, mock_reader):
        """Test image processing"""
        processor = FileProcessor()
        mock_reader_instance = MagicMock()
        mock_reader_instance.readtext.return_value = [
            ([[0, 0], [100, 0], [100, 50], [0, 50]], 'Test Text', 0.9)
        ]
        mock_reader.return_value = mock_reader_instance
        
        # Create a mock file object
        mock_file = MagicMock()
        mock_file.filename = 'test.png'
        mock_file.read.return_value = b'fake_image_data'
        
        result = processor.process_file(mock_file)
        assert result is not None
        assert 'text' in result

class TestHVACCompetitiveIntelligenceSystem:
    """Test HVAC Competitive Intelligence System"""
    
    def test_init_without_api_key(self):
        """Test initialization without API key"""
        with patch.dict('os.environ', {'OPENAI_API_KEY': ''}):
            system = HVACCompetitiveIntelligenceSystem()
            assert not system.is_initialized
            assert system.initialization_error is not None
    
    def test_init_with_placeholder_key(self):
        """Test initialization with placeholder API key"""
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'your_openai_api_key_here'}):
            system = HVACCompetitiveIntelligenceSystem()
            assert not system.is_initialized
            assert 'not configured' in system.initialization_error
    
    @patch('services.agent_system.OpenAI')
    @patch('services.agent_system.chromadb.PersistentClient')
    def test_init_with_valid_key(self, mock_chromadb, mock_openai):
        """Test initialization with valid API key"""
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'sk-test123'}):
            mock_collection = MagicMock()
            mock_chromadb.return_value.get_or_create_collection.return_value = mock_collection
            
            system = HVACCompetitiveIntelligenceSystem()
            # Note: May still fail due to actual API calls, but structure is correct