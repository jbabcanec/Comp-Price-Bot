import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import FileUpload from '../components/FileUpload';

jest.mock('axios');

describe('FileUpload Component', () => {
  beforeEach(() => {
    axios.get.mockClear();
  });

  test('renders upload interface', () => {
    render(<FileUpload />);
    const uploadTitle = screen.getByText(/Upload Competitor Data/i);
    expect(uploadTitle).toBeInTheDocument();
  });

  test('shows system checking status initially', async () => {
    axios.get.mockResolvedValue({ data: { status: 'healthy' } });
    
    render(<FileUpload />);
    const checkingMessage = screen.getByText(/Checking System Status/i);
    expect(checkingMessage).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText(/System Ready/i)).toBeInTheDocument();
    });
  });

  test('shows error when API key not configured', async () => {
    axios.get.mockResolvedValue({ 
      data: { 
        status: 'degraded',
        message: 'OpenAI API key not configured'
      } 
    });
    
    render(<FileUpload />);
    
    await waitFor(() => {
      expect(screen.getByText(/System Not Ready/i)).toBeInTheDocument();
      expect(screen.getByText(/OpenAI API key not configured/i)).toBeInTheDocument();
    });
  });

  test('displays timestamp settings panel', () => {
    render(<FileUpload />);
    const timestampSettings = screen.getByText(/Timestamp Settings/i);
    expect(timestampSettings).toBeInTheDocument();
  });
});