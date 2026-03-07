const BASE = '/api';

export async function searchStops(query) {
  const res = await fetch(`${BASE}/search/stops/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Erreur lors de la recherche');
  const data = await res.json();
  // Rise API search returns an array of results or an object with haltes
  if (Array.isArray(data)) return data;
  if (data.haltes) return data.haltes;
  if (data.results) return data.results;
  return [];
}

export async function quickSearch(query) {
  const res = await fetch(`${BASE}/quicksearch/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Erreur lors de la recherche');
  return res.json();
}

export async function getStopDetails(stopId) {
  const res = await fetch(`${BASE}/stops/${stopId}/details`);
  if (!res.ok) throw new Error("Erreur lors du chargement de l'arret");
  return res.json();
}

export async function getDepartures(stopId, limit = 20) {
  const res = await fetch(`${BASE}/stops/${stopId}/departures?limit=${limit}`);
  if (!res.ok) throw new Error('Erreur lors du chargement des horaires');
  return res.json();
}

export async function getStopLines(stopId) {
  const res = await fetch(`${BASE}/stops/${stopId}/lines`);
  if (!res.ok) throw new Error('Erreur lors du chargement des lignes');
  return res.json();
}
