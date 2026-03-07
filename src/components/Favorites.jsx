import React, { useState, useEffect } from 'react';
import { getFavorites, removeFavorite, getEntityName } from '../utils';

export default function Favorites({ onSelect }) {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  function handleRemove(e, entityId, stopId) {
    e.stopPropagation();
    const updated = removeFavorite(entityId, stopId);
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
      {favorites.map((fav) => (
        <div
          key={`${fav.entiteitnummer}-${fav.halteNummer}`}
          className="card fav-card"
        >
          <div className="fav-card-info" onClick={() => onSelect(fav)}>
            <div className="stop-name">{fav.omschrijving}</div>
            <div className="stop-commune">
              {fav.gemeenteNaam || getEntityName(fav.entiteitnummer)}
            </div>
            <div className="stop-number">Arret #{fav.halteNummer}</div>
          </div>
          <button
            className="remove-fav"
            onClick={(e) => handleRemove(e, fav.entiteitnummer, fav.halteNummer)}
            title="Retirer des favoris"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
