import React, { useState } from 'react';
import SearchStop from './components/SearchStop';
import Departures from './components/Departures';
import Favorites from './components/Favorites';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [selectedStop, setSelectedStop] = useState(null);

  function handleSelectStop(stop) {
    setSelectedStop(stop);
  }

  function handleBack() {
    setSelectedStop(null);
  }

  return (
    <>
      <header className="header">
        <span className="header-icon">🚌</span>
        <div>
          <h1>De Lijn</h1>
          <div className="header-subtitle">Horaires en temps reel</div>
        </div>
      </header>

      <div className="container">
        {selectedStop ? (
          <Departures stop={selectedStop} onBack={handleBack} />
        ) : (
          <>
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'search' ? 'active' : ''}`}
                onClick={() => setActiveTab('search')}
              >
                🔍 Rechercher
              </button>
              <button
                className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favorites')}
              >
                ⭐ Favoris
              </button>
            </div>

            {activeTab === 'search' ? (
              <SearchStop onSelect={handleSelectStop} />
            ) : (
              <Favorites onSelect={handleSelectStop} />
            )}
          </>
        )}
      </div>
    </>
  );
}
