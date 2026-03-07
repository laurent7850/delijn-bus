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
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    return res.status(500).json({
      error: 'API key not configured. Get your free key at https://data.delijn.be/',
    });
  }

  try {
    const url = `${apiBase}${path}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({
        error: `De Lijn API error: ${response.status}`,
        details: text,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(500).json({ error: 'Failed to reach De Lijn API' });
  }
}

// Search stops by name
app.get('/api/search/stops/:query', (req, res) => {
  proxyRequest(ZOEK_BASE, `/zoek/haltes/${encodeURIComponent(req.params.query)}`, res);
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
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    console.warn('WARNING: No API key configured! Copy .env.example to .env and add your key.');
  }
});
