import React, { useState, useEffect, useCallback } from 'react';
import { getRealTimeDepartures } from '../api';
import { formatTime, getMinutesUntil, isFavorite, addFavorite, removeFavorite, getEntityName } from '../utils';

export default function Departures({ stop, onBack }) {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [fav, setFav] = useState(
    isFavorite(stop.entiteitnummer, stop.halteNummer)
  );

  const fetchDepartures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRealTimeDepartures(
        stop.entiteitnummer,
        stop.halteNummer
      );
      // Flatten all departures from all line directions
      const allDepartures = [];
      if (Array.isArray(data)) {
        data.forEach((doorkomst) => {
          const doorkomsten = doorkomst.doorkomsten || [];
          doorkomsten.forEach((d) => {
            allDepartures.push({
              lineNumber: doorkomst.lijnnummer || d.lijnnummer,
              lineName: doorkomst.lijnbeschrijving || '',
              entityId: doorkomst.entiteitnummer || stop.entiteitnummer,
              direction: doorkomst.richting || d.richting,
              destination: doorkomst.bestemming || d.bestemming || 'Inconnu',
              scheduledTime: d.dienstrepijtijd || d.dienstregelingtijdstip,
              realTime: d.real_timeTijdstip || d.realtimeTijdstip,
              prediction: d.predictionStatussen,
            });
          });
        });
      }

      // Sort by real-time or scheduled time
      allDepartures.sort((a, b) => {
        const timeA = new Date(a.realTime || a.scheduledTime);
        const timeB = new Date(b.realTime || b.scheduledTime);
        return timeA - timeB;
      });

      setDepartures(allDepartures);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [stop]);

  useEffect(() => {
    fetchDepartures();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [fetchDepartures]);

  function toggleFavorite() {
    if (fav) {
      removeFavorite(stop.entiteitnummer, stop.halteNummer);
      setFav(false);
    } else {
      addFavorite(stop);
      setFav(true);
    }
  }

  function getTimeDisplay(dep) {
    const time = dep.realTime || dep.scheduledTime;
    const minutes = getMinutesUntil(time);

    if (minutes === null) return { text: '--', className: '', label: '' };
    if (minutes <= 0) return { text: 'NOW', className: 'imminent', label: '' };
    if (minutes <= 1) return { text: '1', className: 'imminent', label: 'min' };
    if (minutes <= 10) return { text: `${minutes}`, className: 'soon', label: 'min' };
    return { text: `${minutes}`, className: '', label: 'min' };
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

      <div className="stop-title">{stop.omschrijving}</div>
      <div className="stop-subtitle">
        {stop.gemeenteNaam || getEntityName(stop.entiteitnummer)} — Arret #{stop.halteNummer}
      </div>

      <div className="refresh-bar">
        <button className="refresh-btn" onClick={fetchDepartures}>
          🔄 Rafraichir
        </button>
        {lastUpdate && (
          <span className="last-update">
            Mis a jour: {formatTime(lastUpdate.toISOString())}
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

      {departures.map((dep, i) => {
        const display = getTimeDisplay(dep);
        const isRealTime = !!dep.realTime;

        return (
          <div className="departure-row" key={i}>
            <div className="line-badge">{dep.lineNumber}</div>
            <div className="departure-info">
              <div className="departure-destination">{dep.destination}</div>
              <div className="departure-details">
                {isRealTime ? '📡 Temps reel' : '📅 Horaire'}
                {dep.scheduledTime && ` — Prevu: ${formatTime(dep.scheduledTime)}`}
              </div>
            </div>
            <div className="departure-time">
              <div className={`time-minutes ${display.className}`}>
                {display.text}
              </div>
              <div className="time-label">{display.label}</div>
              {dep.realTime && (
                <div className="time-scheduled">{formatTime(dep.realTime)}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
