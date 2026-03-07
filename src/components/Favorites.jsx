import React, { useState, useEffect } from 'react';
import { getFavorites, removeFavorite } from '../utils';

export default function Favorites({ onSelect }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  function handleRemove(e, stopId) {
    e.stopPropagation();
    const updated = removeFavorite(stopId);
    setFavorites(updated);
  }

  if (favorites.length === 0) {
    return (
      <div className="fav-empty">
        <div className="fav-empty-icon">⭐</div>
        <h3>Pas encore de favoris</h3>
        <p>
          Recherchez un arret et appuyez sur<br />
          l'etoile pour l'ajouter ici.
        </p>
      </div>
    );
  }

  return (
    <div>
      {favorites.map((fav) => {
        const id = fav.stopId || fav.halteNummer;
        return (
          <div key={id} className="card fav-card">
            <div className="fav-card-info" onClick={() => onSelect(fav)}>
              <div className="stop-name">{fav.omschrijving}</div>
              {fav.gemeenteNaam && <div className="stop-commune">{fav.gemeenteNaam}</div>}
              <div className="stop-number">Arret #{id}</div>
            </div>
            <button
              className="remove-fav"
              onClick={(e) => handleRemove(e, id)}
              title="Retirer des favoris"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
