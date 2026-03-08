import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const DELIJN = 'https://www.delijn.be';

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
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; DeLijnApp/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`[SEARCH] Error ${response.status}`);
      return res.status(response.status).json({ error: 'Search failed' });
    }

    const data = await response.json();
    const results = data.stopsAndLines?.results || [];

    // Transform to a simpler format for the frontend
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

// --- Get departures by scraping the De Lijn stop page ---
app.get('/api/stops/:stopId/departures', async (req, res) => {
  const stopId = req.params.stopId;
  const url = `${DELIJN}/haltes/${stopId}/`;
  console.log(`[DEPARTURES] Fetching ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0 (compatible; DeLijnApp/1.0)',
        'Accept-Language': 'fr-BE,fr;q=0.9',
      },
    });

    if (!response.ok) {
      console.error(`[DEPARTURES] Error ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to load stop' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract stop info from page
    const stopName = $('h1').first().text().trim() ||
      $('[class*="stop-name"], [class*="StopName"]').first().text().trim();

    // Parse departures from the rendered HTML
    const departures = [];

    // Look for passage/departure rows in the HTML
    // The page structure has departure items with line number, destination, and time
    $('[class*="passage"], [class*="Passage"], [class*="departure"], [class*="Departure"]').each((i, el) => {
      const $el = $(el);
      const text = $el.text();

      // Try to extract line number, destination, time
      const lineEl = $el.find('[class*="line"], [class*="Line"], [class*="badge"]').first();
      const destEl = $el.find('[class*="dest"], [class*="Dest"], [class*="direction"]').first();
      const timeEl = $el.find('[class*="time"], [class*="Time"]').first();

      if (lineEl.length || destEl.length || timeEl.length) {
        departures.push({
          lineNumber: lineEl.text().trim(),
          destination: destEl.text().trim(),
          time: timeEl.text().trim(),
          raw: text.substring(0, 200),
        });
      }
    });

    // Fallback: parse from page text if no structured elements found
    if (departures.length === 0) {
      const bodyText = $('body').text();
      const passagesMatch = bodyText.indexOf('Upcoming passages');
      const passagesMatchFr = bodyText.indexOf('Prochains passages');
      const passagesMatchNl = bodyText.indexOf('Eerstvolgende doorkomsten');
      const startIdx = Math.max(passagesMatch, passagesMatchFr, passagesMatchNl);

      if (startIdx > -1) {
        // Extract the text after "Upcoming passages" and parse it
        const passageText = bodyText.substring(startIdx, startIdx + 2000);
        // Pattern: Line XX\nDestination\nDescription\nHH:MM
        const timeRegex = /(\d{1,2}:\d{2})/g;
        const lines = passageText.split('\n').map((l) => l.trim()).filter(Boolean);

        let currentLine = null;
        let currentDest = null;
        let currentDesc = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Skip header
          if (line.includes('Upcoming passages') || line.includes('Prochains passages') ||
              line.includes('Eerstvolgende') || line === 'Now' || line === 'Maintenant' ||
              line === 'Nu' || line.includes('Diversion') || line.includes('Omleiding') ||
              line.includes('view solutions') || line.includes('Show next')) {
            continue;
          }

          // Check if this is a line number (e.g., "Line 77" or just "77")
          const lineMatch = line.match(/^(?:Line |Lijn |Ligne )?(\d+[A-Za-z]?)\s*$/);
          // Check if this is a combined line+dest like "77Deinze Kerkhof"
          const combinedMatch = line.match(/^(\d+[A-Za-z]?)([A-Z].+)$/);
          // Check if this is a time
          const timeMatch = line.match(/^(\d{1,2}:\d{2})$/);

          if (combinedMatch) {
            currentLine = combinedMatch[1];
            currentDest = combinedMatch[2];
            currentDesc = null;
          } else if (lineMatch) {
            currentLine = lineMatch[1];
            currentDest = null;
            currentDesc = null;
          } else if (timeMatch && currentLine) {
            departures.push({
              lineNumber: currentLine,
              destination: currentDest || '',
              description: currentDesc || '',
              scheduledTime: timeMatch[1],
              realTime: null,
            });
          } else if (currentLine && !currentDest) {
            currentDest = line;
          } else if (currentLine && currentDest && !currentDesc) {
            currentDesc = line;
          }
        }
      }
    }

    console.log(`[DEPARTURES] Found ${departures.length} departures for stop ${stopId}`);
    res.json({
      stopId,
      stopName,
      departures,
    });
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
