import { render, screen } from '@testing-library/react';
import App from '../App';

test('renders app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/HVAC Competitive Pricing Intelligence/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders navigation menu', () => {
  render(<App />);
  const uploadLink = screen.getByText(/Upload Files/i);
  const searchLink = screen.getByText(/Search & Match/i);
  const historyLink = screen.getByText(/Match History/i);
  const dashboardLink = screen.getByText(/Dashboard/i);
  const settingsLink = screen.getByText(/Settings/i);
  
  expect(uploadLink).toBeInTheDocument();
  expect(searchLink).toBeInTheDocument();
  expect(historyLink).toBeInTheDocument();
  expect(dashboardLink).toBeInTheDocument();
  expect(settingsLink).toBeInTheDocument();
});

test('starts with upload page selected', () => {
  render(<App />);
  // Check if upload is the default selected menu
  const uploadMenuItem = screen.getByRole('menuitem', { name: /Upload Files/i });
  expect(uploadMenuItem).toHaveClass('ant-menu-item-selected');
});