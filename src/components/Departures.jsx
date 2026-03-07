import React, { useState, useEffect, useCallback } from 'react';
import { getDepartures } from '../api';
import { formatTime, getMinutesUntil, isFavorite, addFavorite, removeFavorite } from '../utils';

export default function Departures({ stop, onBack }) {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [fav, setFav] = useState(
    isFavorite(stop.stopId || stop.halteNummer)
  );

  const stopId = stop.stopId || stop.halteNummer;

  const fetchDepartures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDepartures(stopId);

      // Parse Rise API response - could be array or object with doorkomsten
      let parsed = [];
      const items = Array.isArray(data) ? data : (data.doorkomsten || data.vertrekken || data.results || []);

      items.forEach((d) => {
        parsed.push({
          lineNumber: d.lijnnummerPubliek || d.lijnnummer || d.lijnNummerPubliek || d.lijn || '',
          destination: d.bestemming || d.richting || d.omschrijving || 'Inconnu',
          scheduledTime: d.vertrekCalendar || d.vertrekTijd || d.dienstrepijtijd || d.geplandVertrek || null,
          realTime: d.vertrekRealtimeCalendar || d.realtimeVertrekTijd || d.realtimeVertrek || null,
          lineColor: d.kleurAchterGrond || d.lijnKleur || null,
          lineTextColor: d.kleurVoorGrond || d.lijnTekstKleur || null,
          predictionType: d.predictionStatussen || d.voorspelling || null,
          cancelled: d.geannuleerd || false,
        });
      });

      // Sort by departure time
      parsed.sort((a, b) => {
        const timeA = new Date(a.realTime || a.scheduledTime || 0);
        const timeB = new Date(b.realTime || b.scheduledTime || 0);
        return timeA - timeB;
      });

      setDepartures(parsed);
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
        {stop.gemeenteNaam && `${stop.gemeenteNaam} — `}Arret #{stopId}
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
        const badgeStyle = dep.lineColor
          ? { backgroundColor: dep.lineColor, color: dep.lineTextColor || '#1a1a2e' }
          : {};

        return (
          <div className={`departure-row ${dep.cancelled ? 'cancelled' : ''}`} key={i}>
            <div className="line-badge" style={badgeStyle}>{dep.lineNumber}</div>
            <div className="departure-info">
              <div className="departure-destination">{dep.destination}</div>
              <div className="departure-details">
                {dep.cancelled ? '❌ Annule' : isRealTime ? '📡 Temps reel' : '📅 Horaire'}
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
