import React, { useState, useEffect, useCallback } from 'react';
import { getDepartures } from '../api';
import { isFavorite, addFavorite, removeFavorite } from '../utils';

export default function Departures({ stop, onBack }) {
  const [departures, setDepartures] = useState([]);
  const [stopName, setStopName] = useState(stop.omschrijving || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [fav, setFav] = useState(isFavorite(stop.stopId));

  const stopId = stop.stopId;

  const fetchDepartures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDepartures(stopId);

      if (data.stopName) setStopName(data.stopName);
      setDepartures(data.departures || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [stopId]);

  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [fetchDepartures]);

  function toggleFavorite() {
    if (fav) {
      removeFavorite(stopId);
      setFav(false);
    } else {
      addFavorite({ ...stop, stopId });
      setFav(true);
    }
  }

  function formatUpdateTime(date) {
    return date.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div>
      <div className="departure-header">
        <button className="back-btn" onClick={onBack}>
          ← Retour
        </button>
        <button
          className={`fav-btn ${fav ? 'active' : ''}`}
          onClick={toggleFavorite}
          title={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {fav ? '★' : '☆'}
        </button>
      </div>

      <div className="stop-title">{stopName}</div>
      <div className="stop-subtitle">
        {stop.gemeenteNaam && `${stop.gemeenteNaam} — `}Arret #{stopId}
      </div>

      <div className="refresh-bar">
        <button className="refresh-btn" onClick={fetchDepartures}>
          🔄 Rafraichir
        </button>
        {lastUpdate && (
          <span className="last-update">
            Mis a jour: {formatUpdateTime(lastUpdate)}
          </span>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading && departures.length === 0 && (
        <div className="loading">
          <div className="spinner" />
          <p>Chargement des horaires...</p>
        </div>
      )}

      {!loading && departures.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">🕐</div>
          <p>Aucun passage prevu pour le moment.</p>
        </div>
      )}

      {departures.map((dep, i) => (
        <div className="departure-row" key={i}>
          <div className="line-badge">{dep.lineNumber}</div>
          <div className="departure-info">
            <div className="departure-destination">{dep.destination}</div>
            {dep.description && (
              <div className="departure-details">{dep.description}</div>
            )}
          </div>
          <div className="departure-time">
            <div className="time-minutes">
              {dep.scheduledTime || dep.time || '--'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
