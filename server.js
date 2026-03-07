import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.DELIJN_API_KEY;

const KERN_BASE = 'https://api.delijn.be/DLKernOpenData/api/v1';
const ZOEK_BASE = 'https://api.delijn.be/DLZoekOpenData/api/v1';

app.use(cors());
app.use(express.json());

// Serve built frontend in production
app.use(express.static(join(__dirname, 'dist')));

const headers = {
  'Ocp-Apim-Subscription-Key': API_KEY,
  'Accept': 'application/json',
};

async function proxyRequest(apiBase, path, res) {
  if (!API_KEY || API_KEY === 'your_api_key_here' || API_KEY === 'not_configured_yet') {
    return res.status(500).json({
      error: 'API key not configured. Get your free key at https://data.delijn.be/',
    });
  }

  const url = `${apiBase}${path}`;
  console.log(`[PROXY] ${url}`);

  try {
    const response = await fetch(url, { headers });
    const text = await response.text();

    console.log(`[PROXY] Status: ${response.status} | Body length: ${text.length}`);

    if (!response.ok) {
      console.error(`[PROXY ERROR] ${response.status}: ${text.substring(0, 500)}`);
      return res.status(response.status).json({
        error: `De Lijn API error: ${response.status}`,
        details: text.substring(0, 500),
        url: url,
      });
    }

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch {
      // Response is not JSON
      console.error(`[PROXY] Non-JSON response: ${text.substring(0, 200)}`);
      res.status(502).json({ error: 'Non-JSON response from API', details: text.substring(0, 200) });
    }
  } catch (err) {
    console.error(`[PROXY ERROR] ${err.message}`);
    res.status(500).json({ error: 'Failed to reach De Lijn API', details: err.message });
  }
}

// Search stops by name - try Zoek API first, fallback to Kern API
app.get('/api/search/stops/:query', async (req, res) => {
  const query = encodeURIComponent(req.params.query);

  // Try the search API (DLZoekOpenData)
  const zoekUrl = `${ZOEK_BASE}/zoek/haltes/${query}`;
  console.log(`[SEARCH] Trying Zoek API: ${zoekUrl}`);

  try {
    const response = await fetch(zoekUrl, { headers });

    if (response.ok) {
      const data = await response.json();
      console.log(`[SEARCH] Zoek API success, found ${data.aantalHits || 0} hits`);
      return res.json(data);
    }

    console.log(`[SEARCH] Zoek API failed with ${response.status}, trying Kern API...`);
  } catch (err) {
    console.log(`[SEARCH] Zoek API error: ${err.message}, trying Kern API...`);
  }

  // Fallback: search across all entities using Kern API
  try {
    const entities = [1, 2, 3, 4, 5]; // All De Lijn entities
    const searchTerm = req.params.query.toLowerCase();
    const allStops = [];

    for (const entity of entities) {
      const kernUrl = `${KERN_BASE}/haltes/${entity}?maxAantalHaltes=500`;
      console.log(`[SEARCH] Trying Kern API entity ${entity}: ${kernUrl}`);

      try {
        const response = await fetch(kernUrl, { headers });
        if (response.ok) {
          const data = await response.json();
          const haltes = data.haltes || data.halteObjects || [];
          const matching = haltes.filter(h =>
            (h.omschrijving || '').toLowerCase().includes(searchTerm) ||
            (h.omschrijvingGemeente || '').toLowerCase().includes(searchTerm)
          );
          allStops.push(...matching.map(h => ({
            ...h,
            entiteitnummer: h.entiteitnummer || String(entity),
            halteNummer: h.haltenummer || h.halteNummer,
          })));
        }
      } catch {
        // skip this entity
      }
    }

    console.log(`[SEARCH] Kern API found ${allStops.length} matching stops`);
    res.json({ haltes: allStops.slice(0, 20), aantalHits: allStops.length });
  } catch (err) {
    console.error(`[SEARCH] All search methods failed: ${err.message}`);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

// Get all entities (provinces)
app.get('/api/entities', (req, res) => {
  proxyRequest(KERN_BASE, '/entiteiten', res);
});

// Get stop details
app.get('/api/stops/:entity/:stop', (req, res) => {
  proxyRequest(KERN_BASE, `/haltes/${req.params.entity}/${req.params.stop}`, res);
});

// Get real-time departures for a stop
app.get('/api/stops/:entity/:stop/realtime', (req, res) => {
  proxyRequest(
    KERN_BASE,
    `/haltes/${req.params.entity}/${req.params.stop}/real-time`,
    res
  );
});

// Get timetable for a stop
app.get('/api/stops/:entity/:stop/timetable', (req, res) => {
  proxyRequest(
    KERN_BASE,
    `/haltes/${req.params.entity}/${req.params.stop}/dienstregelingen`,
    res
  );
});

// Get lines passing through a stop
app.get('/api/stops/:entity/:stop/lines', (req, res) => {
  proxyRequest(
    KERN_BASE,
    `/haltes/${req.params.entity}/${req.params.stop}/lijnrichtingen`,
    res
  );
});

// Get line details
app.get('/api/lines/:entity/:line', (req, res) => {
  proxyRequest(KERN_BASE, `/lijnen/${req.params.entity}/${req.params.line}`, res);
});

// Get line directions
app.get('/api/lines/:entity/:line/directions', (req, res) => {
  proxyRequest(
    KERN_BASE,
    `/lijnen/${req.params.entity}/${req.params.line}/lijnrichtingen`,
    res
  );
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`De Lijn proxy server running on http://localhost:${PORT}`);
  console.log(`API Key configured: ${API_KEY ? 'YES (' + API_KEY.substring(0, 4) + '...)' : 'NO'}`);
});
