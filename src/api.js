const BASE = '/api';

export async function searchStops(query) {
  const res = await fetch(`${BASE}/search/stops/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Erreur lors de la recherche');
  // Server now returns a clean array of stops
  return res.json();
}

export async function getDepartures(stopId) {
  const res = await fetch(`${BASE}/stops/${stopId}/departures`);
  if (!res.ok) throw new Error('Erreur lors du chargement des horaires');
  return res.json();
}
