import React, { useState, useRef, useCallback } from 'react';
import { searchStops } from '../api';

export default function SearchStop({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const stops = await searchStops(q);
      setResults(Array.isArray(stops) ? stops : []);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  }

  return (
    <div>
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="Nom de l'arret (ex: Gent Sint-Pieters)"
          value={query}
          onChange={handleChange}
          autoFocus
        />
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <p>Recherche en cours...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p>Aucun arret trouve.<br />Essayez un autre nom.</p>
        </div>
      )}

      {!loading && results.map((stop, index) => {
        // Rise API uses halteNummer or halte_id or id
        const stopId = stop.halteNummer || stop.haltenummer || stop.halte_id || stop.id || '';
        const name = stop.omschrijving || stop.beschrijving || stop.naam || stop.title || '';
        const commune = stop.gemeenteNaam || stop.omschrijvingGemeente || stop.gemeente || '';

        return (
          <div
            key={`${stopId}-${index}`}
            className="card"
            onClick={() => onSelect({
              ...stop,
              stopId: stopId,
              halteNummer: stopId,
              omschrijving: name,
              gemeenteNaam: commune,
            })}
          >
            <div className="stop-name">{name}</div>
            {commune && <div className="stop-commune">{commune}</div>}
            {stopId && <div className="stop-number">Arret #{stopId}</div>}
          </div>
        );
      })}

      {!searched && !loading && (
        <div className="empty-state">
          <div className="empty-icon">🚏</div>
          <p>
            Tapez le nom d'un arret pour voir<br />
            les prochains passages de bus.
          </p>
        </div>
      )}
    </div>
  );
}
