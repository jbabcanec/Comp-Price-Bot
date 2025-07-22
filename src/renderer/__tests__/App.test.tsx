import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('renders the welcome message', () => {
    render(<App />);
    const welcomeElement = screen.getByText(/Welcome!/i);
    expect(welcomeElement).toBeInTheDocument();
  });

  it('displays the app title', () => {
    render(<App />);
    const titleElement = screen.getByText(/HVAC SKU Crosswalk Analyzer/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('shows phase 1 completion status', () => {
    render(<App />);
    const phaseElement = screen.getByText(/Phase 1: Foundation/i);
    expect(phaseElement).toBeInTheDocument();
  });
});