export function formatTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleTimeString('fr-BE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getMinutesUntil(isoString) {
  if (!isoString) return null;
  const now = new Date();
  const target = new Date(isoString);
  if (isNaN(target.getTime())) return null;
  const diffMs = target - now;
  return Math.round(diffMs / 60000);
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
  const id = stop.stopId || stop.halteNummer;
  if (!favs.find((f) => (f.stopId || f.halteNummer) === id)) {
    favs.push({
      stopId: id,
      halteNummer: id,
      omschrijving: stop.omschrijving || '',
      gemeenteNaam: stop.gemeenteNaam || '',
    });
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  }
  return favs;
}

export function removeFavorite(stopId) {
  let favs = getFavorites();
  favs = favs.filter((f) => (f.stopId || f.halteNummer) !== stopId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return favs;
}

export function isFavorite(stopId) {
  return getFavorites().some((f) => (f.stopId || f.halteNummer) === stopId);
}
