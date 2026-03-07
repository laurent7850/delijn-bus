import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// De Lijn Rise API (powers their website, no API key needed)
const RISE_CORE = 'https://www.delijn.be/rise-api-core';
const RISE_SEARCH = 'https://www.delijn.be/rise-api-search';

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

async function riseRequest(url, res) {
  console.log(`[API] ${url}`);
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    const text = await response.text();
    console.log(`[API] ${response.status} | ${text.length} bytes`);

    if (!response.ok) {
      console.error(`[API ERROR] ${text.substring(0, 300)}`);
      return res.status(response.status).json({
        error: `De Lijn API error: ${response.status}`,
      });
    }

    try {
      const data = JSON.parse(text);
      res.json(data);
    } catch {
      console.error(`[API] Non-JSON: ${text.substring(0, 200)}`);
      res.status(502).json({ error: 'Invalid response from De Lijn' });
    }
  } catch (err) {
    console.error(`[API ERROR] ${err.message}`);
    res.status(500).json({ error: 'Failed to reach De Lijn API' });
  }
}

// Search stops by name
app.get('/api/search/stops/:query', (req, res) => {
  const q = encodeURIComponent(req.params.query);
  riseRequest(`${RISE_SEARCH}/search/haltes/${q}/1`, res);
});

// Quick search (stops + lines + locations)
app.get('/api/quicksearch/:query', (req, res) => {
  const q = encodeURIComponent(req.params.query);
  riseRequest(`${RISE_SEARCH}/search/quicksearch/${q}`, res);
});

// Location search
app.get('/api/locations/:query', (req, res) => {
  const q = encodeURIComponent(req.params.query);
  riseRequest(`${RISE_SEARCH}/locations/locatiezoeker/10/${q}`, res);
});

// Get stop title/details
app.get('/api/stops/:stopId/details', (req, res) => {
  riseRequest(`${RISE_CORE}/haltes/titel/${req.params.stopId}`, res);
});

// Get real-time departures for a stop
app.get('/api/stops/:stopId/departures', (req, res) => {
  const numResults = req.query.limit || 20;
  riseRequest(`${RISE_CORE}/haltes/vertrekken/${req.params.stopId}/${numResults}`, res);
});

// Get lines passing through a stop
app.get('/api/stops/:stopId/lines', (req, res) => {
  riseRequest(`${RISE_CORE}/haltes/doorkomendelijnen/${req.params.stopId}`, res);
});

// Get nearby stops
app.get('/api/nearby/:x/:y/:radius', (req, res) => {
  riseRequest(`${RISE_CORE}/haltes/indebuurt/${req.params.x}/${req.params.y}/${req.params.radius}`, res);
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`De Lijn Bus app running on http://localhost:${PORT}`);
});
