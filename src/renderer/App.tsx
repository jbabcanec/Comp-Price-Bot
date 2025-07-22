import React from 'react';
import { MainLayout } from './components/layout/MainLayout';

const App: React.FC = () => {
  return (
    <MainLayout initialPage="dashboard" />
  );
};

export default App;
