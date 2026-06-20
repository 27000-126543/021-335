import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import VolumeListPage from './pages/VolumeListPage';
import VolumeContentsPage from './pages/VolumeContentsPage';

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/volumes" element={<VolumeListPage />} />
          <Route path="/contents" element={<VolumeContentsPage />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
