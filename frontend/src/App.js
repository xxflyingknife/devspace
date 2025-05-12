import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SpaceListPage from './pages/SpaceListPage';
import SpaceDetailPage from './pages/SpaceDetailPage';
import './App.css';

function App() {
  return (
    <div className="App">
      <Routes>
        {/* Route for the space list page */}
        <Route path="/" element={<SpaceListPage />} />
        {/* Route for the space detail page, with spaceId parameter */}
        <Route path="/space/:spaceId" element={<SpaceDetailPage />} />
        {/* You could add a Not Found route here */}
      </Routes>
    </div>
  );
}

export default App;
