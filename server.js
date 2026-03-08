import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const DELIJN = 'https://www.delijn.be';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// --- Search stops using De Lijn website API ---
app.get('/api/search/stops/:query', async (req, res) => {
  const q = encodeURIComponent(req.params.query);
  const url = `${DELIJN}/api/search/?q=${q}&stopsAndLinesSize=20&contentSize=0&info=false&municipality=false&news=false&stops=true`;
  console.log(`[SEARCH] ${url}`);

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': UA },
    });

    if (!response.ok) {
      console.error(`[SEARCH] Error ${response.status}`);
      return res.status(response.status).json({ error: 'Search failed' });
    }

    const data = await response.json();
    const results = data.stopsAndLines?.results || [];

    const stops = results
      .filter((r) => r.type === 'stop')
      .map((r) => ({
        stopId: r.id,
        omschrijving: r.longDescription || r.shortDescription || '',
        gemeenteNaam: r.cityDescription || '',
        coordinate: r.coordinate || '',
        lines: (r.lineDirections || []).map((ld) => ({
          number: ld.publicLineNr,
          destination: ld.destination,
          description: ld.description,
          color: ld.color,
        })),
      }));

    console.log(`[SEARCH] Found ${stops.length} stops`);
    res.json(stops);
  } catch (err) {
    console.error(`[SEARCH ERROR] ${err.message}`);
    res.status(500).json({ error: 'Failed to search stops' });
  }
});

// --- Get departures using De Lijn networktrips API ---
app.get('/api/stops/:stopId/departures', async (req, res) => {
  const stopId = req.params.stopId;
  const now = new Date().toISOString().slice(0, 19);
  const url = `${DELIJN}/api/networktrips/stops/${stopId}/?type=MERGEFLEX&detoursPolicy=noDetours&enrichmentType=LINEDIRECTIONS&date=${now}`;
  console.log(`[DEPARTURES] ${url}`);

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': UA },
    });

    if (!response.ok) {
      console.error(`[DEPARTURES] Error ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to load departures' });
    }

    const data = await response.json();
    const trips = data.trips || [];

    const departures = trips.map((trip) => {
      const passage = trip.passages?.[0];
      const planned = passage?.plannedPassage;
      const realtime = passage?.realtimePassage;
      const line = trip.lineDirection?.line;
      const hasRealtime = passage?.realtimeStatuses?.includes('REALTIME');

      // Format time as HH:MM
      const formatTime = (dt) => {
        if (!dt) return null;
        const d = new Date(dt);
        return d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
      };

      const scheduledTime = formatTime(planned?.departureDateTime || planned?.arrivalDateTime);
      const realTime = hasRealtime ? formatTime(realtime?.departureDateTime || realtime?.arrivalDateTime) : null;

      // Calculate minutes until arrival
      const arrivalEpoch = hasRealtime
        ? (realtime?.arrivalEpoch || realtime?.departureEpoch)
        : (planned?.arrivalEpoch || planned?.departureEpoch);
      const minutesUntil = arrivalEpoch ? Math.round((arrivalEpoch - Date.now()) / 60000) : null;

      return {
        lineNumber: line?.publicLineNr || '',
        lineColor: line?.lineColor || null,
        destination: trip.placeDestination || trip.planningDestination || '',
        description: trip.lineDirection?.description || '',
        scheduledTime,
        realTime,
        minutesUntil,
        isRealtime: hasRealtime,
      };
    });

    // Sort by arrival time and filter out past departures
    const upcoming = departures
      .filter((d) => d.minutesUntil === null || d.minutesUntil >= -1)
      .sort((a, b) => (a.minutesUntil ?? 999) - (b.minutesUntil ?? 999));

    console.log(`[DEPARTURES] Found ${upcoming.length} departures for stop ${stopId}`);
    res.json({ stopId, departures: upcoming });
  } catch (err) {
    console.error(`[DEPARTURES ERROR] ${err.message}`);
    res.status(500).json({ error: 'Failed to load departures' });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`De Lijn Bus app running on http://localhost:${PORT}`);
});
