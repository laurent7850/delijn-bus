const BASE = '/api';

export async function searchStops(query) {
  const res = await fetch(`${BASE}/search/stops/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Erreur lors de la recherche');
  const data = await res.json();
  return data.haltes || [];
}

export async function getStopDetails(entityId, stopId) {
  const res = await fetch(`${BASE}/stops/${entityId}/${stopId}`);
  if (!res.ok) throw new Error('Erreur lors du chargement de l\'arrêt');
  return res.json();
}

export async function getRealTimeDepartures(entityId, stopId) {
  const res = await fetch(`${BASE}/stops/${entityId}/${stopId}/realtime`);
  if (!res.ok) throw new Error('Erreur lors du chargement des horaires');
  const data = await res.json();
  return data.halteDoorkomsten || [];
}

export async function getStopLines(entityId, stopId) {
  const res = await fetch(`${BASE}/stops/${entityId}/${stopId}/lines`);
  if (!res.ok) throw new Error('Erreur lors du chargement des lignes');
  const data = await res.json();
  return data.lijnrichtingen || [];
}

export async function getTimetable(entityId, stopId) {
  const res = await fetch(`${BASE}/stops/${entityId}/${stopId}/timetable`);
  if (!res.ok) throw new Error('Erreur lors du chargement des horaires');
  return res.json();
}
