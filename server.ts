import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const portArgIndex = process.argv.indexOf('--port');
const rawPort = (portArgIndex !== -1 ? process.argv[portArgIndex + 1] : undefined) || process.env.PORT || '3000';
const PORT = Number(rawPort) || 3000;

// Enable CORS for cross-device synchronization and GitHub Pages hosting
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

// Path to persistent disruptions & articles JSON files
const DATA_DIR = path.join(__dirname, 'data');
const DISRUPTIONS_FILE = path.join(DATA_DIR, 'disruptions.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const TRAVEL_TIMES_FILE = path.join(DATA_DIR, 'travel_times.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface StoredArticle {
  id: string;
  title: string;
  titleEn?: string;
  summary: string;
  summaryEn?: string;
  content: string;
  contentEn?: string;
  category: 'news' | 'update' | 'tutorial' | 'maintenance';
  author: string;
  publishedAt: number;
  readTimeMinutes: number;
  pinned?: boolean;
  tags?: string[];
}

function loadArticles(): StoredArticle[] {
  try {
    if (fs.existsSync(ARTICLES_FILE)) {
      const data = fs.readFileSync(ARTICLES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading articles file:', err);
  }
  return [];
}

function saveArticles(articles: StoredArticle[]) {
  try {
    fs.writeFileSync(ARTICLES_FILE, JSON.stringify(articles, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving articles file:', err);
  }
}

let articlesCache: StoredArticle[] = loadArticles();

export interface StoredDisruption {
  id: string;
  lineId: string;
  type: 'missing_tracks' | 'inactive_redstone' | 'empty_minecart' | 'construction' | 'closure';
  title: string;
  description: string;
  fromStationId: string;
  toStationId: string;
  affectedStations: string[];
  reportedBy?: string;
  timestamp: number;
  confirmations: number;
  resolvedReports?: number;
  confirmedByIps?: string[];
  isActive: boolean;
}

function loadDisruptions(): StoredDisruption[] {
  try {
    if (fs.existsSync(DISRUPTIONS_FILE)) {
      const data = fs.readFileSync(DISRUPTIONS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading disruptions file:', err);
  }
  return [];
}

function saveDisruptions(disruptions: StoredDisruption[]) {
  try {
    fs.writeFileSync(DISRUPTIONS_FILE, JSON.stringify(disruptions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving disruptions file:', err);
  }
}

// In-memory cache synced with disk
let disruptionsCache: StoredDisruption[] = loadDisruptions();

export interface StoredSegmentTravelTime {
  id: string;
  lineId: string;
  fromStationId: string;
  toStationId: string;
  durationSeconds: number;
  durationMinutes: number;
  updatedAt: number;
}

function loadTravelTimes(): Record<string, StoredSegmentTravelTime> {
  try {
    if (fs.existsSync(TRAVEL_TIMES_FILE)) {
      const data = fs.readFileSync(TRAVEL_TIMES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch (err) {
    console.error('Error reading travel times file:', err);
  }
  return {};
}

function saveTravelTimes(map: Record<string, StoredSegmentTravelTime>) {
  try {
    fs.writeFileSync(TRAVEL_TIMES_FILE, JSON.stringify(map, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving travel times file:', err);
  }
}

let travelTimesCache: Record<string, StoredSegmentTravelTime> = loadTravelTimes();

// --- API ROUTES ---

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 1. Get all active disruptions
app.get('/api/disruptions', (_req, res) => {
  disruptionsCache = loadDisruptions();
  res.json({
    success: true,
    disruptions: disruptionsCache,
  });
});

// 2. Report a new disruption
app.post('/api/disruptions', (req, res) => {
  const { lineId, type, title, description, fromStationId, toStationId, affectedStations, reportedBy } = req.body;

  if (!lineId || !fromStationId || !toStationId || !type) {
    res.status(400).json({ success: false, error: 'Missing required disruption fields' });
    return;
  }

  disruptionsCache = loadDisruptions();

  const newDisruption: StoredDisruption = {
    id: `disrupt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    lineId,
    type,
    title: title || `${type} between stations`,
    description: description || '',
    fromStationId,
    toStationId,
    affectedStations: affectedStations || [fromStationId, toStationId],
    reportedBy: reportedBy || undefined,
    timestamp: Date.now(),
    confirmations: 1,
    isActive: true,
  };

  disruptionsCache = [newDisruption, ...disruptionsCache];
  saveDisruptions(disruptionsCache);

  res.status(201).json({
    success: true,
    disruption: newDisruption,
  });
});

// 3. Confirm / upvote an existing disruption
app.post('/api/disruptions/:id/confirm', (req, res) => {
  const { id } = req.params;
  disruptionsCache = loadDisruptions();
  const idx = disruptionsCache.findIndex((d) => d.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Disruption not found' });
    return;
  }

  disruptionsCache[idx].confirmations += 1;
  saveDisruptions(disruptionsCache);

  res.json({
    success: true,
    confirmations: disruptionsCache[idx].confirmations,
  });
});

// 4. Report disruption is gone / resolved (disappears when 10 reports reached)
app.post('/api/disruptions/:id/resolve', (req, res) => {
  const { id } = req.params;
  disruptionsCache = loadDisruptions();
  const idx = disruptionsCache.findIndex((d) => d.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Disruption not found' });
    return;
  }

  const reports = (disruptionsCache[idx].resolvedReports || 0) + 1;
  if (reports >= 10) {
    // Reached 10 reports that disruption is gone -> remove it
    disruptionsCache = disruptionsCache.filter((d) => d.id !== id);
    saveDisruptions(disruptionsCache);
    res.json({
      success: true,
      removed: true,
      resolvedReports: 10,
    });
  } else {
    disruptionsCache[idx].resolvedReports = reports;
    saveDisruptions(disruptionsCache);
    res.json({
      success: true,
      removed: false,
      resolvedReports: reports,
    });
  }
});

// 5. Update an existing disruption (admin)
app.put('/api/disruptions/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  disruptionsCache = loadDisruptions();
  const idx = disruptionsCache.findIndex((d) => d.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Disruption not found' });
    return;
  }

  disruptionsCache[idx] = {
    ...disruptionsCache[idx],
    ...updates,
    id, // protect ID
  };
  saveDisruptions(disruptionsCache);

  res.json({
    success: true,
    disruption: disruptionsCache[idx],
  });
});

// 6. Resolve / clear / delete a disruption
app.delete('/api/disruptions/:id', (req, res) => {
  const { id } = req.params;
  disruptionsCache = loadDisruptions();
  disruptionsCache = disruptionsCache.filter((d) => d.id !== id);
  saveDisruptions(disruptionsCache);

  res.json({
    success: true,
  });
});

// --- ARTICLES API ROUTES ---

// 6. Get all published articles
app.get('/api/articles', (_req, res) => {
  articlesCache = loadArticles();
  res.json({
    success: true,
    articles: articlesCache,
  });
});

// 7. Publish new article (admin only, verified via code 'abc123')
app.post('/api/articles', (req, res) => {
  const { title, titleEn, summary, summaryEn, content, contentEn, category, author, readTimeMinutes, pinned, tags, adminCode } = req.body;

  if (adminCode !== 'abc123') {
    res.status(403).json({ success: false, error: 'Unauthorized: Invalid admin code' });
    return;
  }

  if (!title || !content) {
    res.status(400).json({ success: false, error: 'Title and content are required' });
    return;
  }

  articlesCache = loadArticles();

  const newArticle: StoredArticle = {
    id: `article-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    titleEn: titleEn || undefined,
    summary: summary || title,
    summaryEn: summaryEn || undefined,
    content,
    contentEn: contentEn || undefined,
    category: category || 'news',
    author: author || 'ÄÄPIZRM Verkehrsbetriebe',
    publishedAt: Date.now(),
    readTimeMinutes: readTimeMinutes || Math.max(1, Math.round(content.split(/\s+/).length / 160)),
    pinned: !!pinned,
    tags: Array.isArray(tags) ? tags : [],
  };

  articlesCache = [newArticle, ...articlesCache];
  saveArticles(articlesCache);

  res.status(201).json({
    success: true,
    article: newArticle,
  });
});

// 8. Edit / update an existing article (admin only)
app.put('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const { title, summary, content, category, author, readTimeMinutes, pinned, tags, adminCode } = req.body;

  if (adminCode !== 'abc123') {
    res.status(403).json({ success: false, error: 'Unauthorized: Invalid admin code' });
    return;
  }

  articlesCache = loadArticles();
  const idx = articlesCache.findIndex((a) => a.id === id);

  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Article not found' });
    return;
  }

  const existing = articlesCache[idx];
  const updatedArticle: StoredArticle = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    summary: summary !== undefined ? summary : existing.summary,
    content: content !== undefined ? content : existing.content,
    category: category !== undefined ? category : existing.category,
    author: author !== undefined ? author : existing.author,
    readTimeMinutes:
      readTimeMinutes !== undefined
        ? readTimeMinutes
        : content
        ? Math.max(1, Math.round(content.split(/\s+/).length / 160))
        : existing.readTimeMinutes,
    pinned: pinned !== undefined ? !!pinned : existing.pinned,
    tags: Array.isArray(tags) ? tags : existing.tags,
  };

  articlesCache[idx] = updatedArticle;
  saveArticles(articlesCache);

  res.json({
    success: true,
    article: updatedArticle,
  });
});

// 9. Delete an article (admin only)
app.delete('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const adminCode = req.headers['x-admin-code'] || req.query.adminCode || req.body?.adminCode;

  if (adminCode !== 'abc123') {
    res.status(403).json({ success: false, error: 'Unauthorized: Invalid admin code' });
    return;
  }

  articlesCache = loadArticles();
  articlesCache = articlesCache.filter((a) => a.id !== id);
  saveArticles(articlesCache);

  res.json({
    success: true,
    removedId: id,
  });
});

// --- TRAVEL TIMES API ROUTES ---

// 10. Get all measured segment travel time overrides
app.get('/api/travel-times', (_req, res) => {
  travelTimesCache = loadTravelTimes();
  res.json({
    success: true,
    travelTimes: Object.values(travelTimesCache),
    travelTimesMap: travelTimesCache,
  });
});

// 11. Save / overwrite measured segment travel times (admin only)
app.post('/api/travel-times', (req, res) => {
  const { segments, adminCode } = req.body;

  if (adminCode !== 'abc123') {
    res.status(403).json({ success: false, error: 'Unauthorized: Invalid admin code' });
    return;
  }

  if (!Array.isArray(segments) || segments.length === 0) {
    res.status(400).json({ success: false, error: 'Segments array is required' });
    return;
  }

  travelTimesCache = loadTravelTimes();
  const now = Date.now();

  for (const seg of segments) {
    if (!seg || !seg.id || !seg.lineId || !seg.fromStationId || !seg.toStationId) continue;
    const durationSeconds = Math.min(3600, Math.max(1, Math.round(Number(seg.durationSeconds) || 1)));
    const durationMinutes = Math.min(60, Math.max(0.1, Number((durationSeconds / 60).toFixed(1))));
    travelTimesCache[seg.id] = {
      id: String(seg.id),
      lineId: String(seg.lineId),
      fromStationId: String(seg.fromStationId),
      toStationId: String(seg.toStationId),
      durationSeconds,
      durationMinutes,
      updatedAt: typeof seg.updatedAt === 'number' ? seg.updatedAt : now,
    };
  }

  saveTravelTimes(travelTimesCache);

  res.json({
    success: true,
    travelTimes: Object.values(travelTimesCache),
    travelTimesMap: travelTimesCache,
  });
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const server = http.createServer(app);

  server.on('error', (err) => {
    console.error('HTTP server error:', err);
    process.exit(1);
  });

  server.on('clientError', (_err, socket) => {
    socket.destroy();
  });

  if (!isProduction) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const viteReadyPromise = (async () => {
      const { createServer } = await import('vite');
      return createServer({
        server: {
          middlewareMode: true,
          hmr: disableHmr ? false : { server },
          watch: disableHmr ? null : {},
        },
        appType: 'spa',
      });
    })();

    viteReadyPromise.catch((err) => {
      console.error('Failed to initialize Vite dev server:', err);
    });

    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const vite = await viteReadyPromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });

    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const vite = await viteReadyPromise;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
