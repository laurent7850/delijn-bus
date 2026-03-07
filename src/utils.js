export function formatTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('fr-BE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMinutesUntil(isoString) {
  if (!isoString) return null;
  const now = new Date();
  const target = new Date(isoString);
  const diffMs = target - now;
  return Math.round(diffMs / 60000);
}

export function getEntityName(entityId) {
  const entities = {
    1: 'Anvers',
    2: 'Flandre-Orientale',
    3: 'Brabant flamand',
    4: 'Limbourg',
    5: 'Flandre-Occidentale',
  };
  return entities[entityId] || `Entité ${entityId}`;
}

// Favorites management via localStorage
const FAVORITES_KEY = 'delijn_favorites';

export function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

export function addFavorite(stop) {
  const favs = getFavorites();
  if (!favs.find((f) => f.halteNummer === stop.halteNummer && f.entiteitnummer === stop.entiteitnummer)) {
    favs.push({
      halteNummer: stop.halteNummer,
      entiteitnummer: stop.entiteitnummer,
      omschrijving: stop.omschrijving,
      gemeenteNaam: stop.gemeenteNaam || '',
    });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  }
  return favs;
}

export function removeFavorite(entityId, stopId) {
  let favs = getFavorites();
  favs = favs.filter(
    (f) => !(f.halteNummer === stopId && f.entiteitnummer === entityId)
  );
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return favs;
}

export function isFavorite(entityId, stopId) {
  return getFavorites().some(
    (f) => f.halteNummer === stopId && f.entiteitnummer === entityId
  );
}
