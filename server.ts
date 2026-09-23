import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { VelqoarathApiService } from './src/api/service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API Endpoints as specified in Part 13
app.get('/api/currencies', (_req, res) => {
  res.json(VelqoarathApiService.getCurrencies());
});

app.get('/api/currencies/:code', (req, res) => {
  const item = VelqoarathApiService.getCurrencyByCode(req.params.code);
  if (!item) return res.status(404).json({ error: 'Currency not found' });
  res.json(item);
});

app.get('/api/currencies/:code/state', (req, res) => {
  const state = VelqoarathApiService.getCurrencyState(req.params.code);
  if (!state) return res.status(404).json({ error: 'Currency not found' });
  res.json(state);
});

app.get('/api/pairs', (_req, res) => {
  res.json(VelqoarathApiService.getPairs());
});

app.get('/api/pairs/:symbol', (req, res) => {
  const pair = VelqoarathApiService.getPairBySymbol(req.params.symbol);
  if (!pair) return res.status(404).json({ error: 'Pair not found' });
  res.json(pair);
});

app.get('/api/pairs/:symbol/intelligence', (req, res) => {
  const intelligence = VelqoarathApiService.getPairIntelligence(req.params.symbol);
  if (!intelligence) return res.status(404).json({ error: 'Pair intelligence not available' });
  res.json(intelligence);
});

app.get('/api/economic-indicators', (_req, res) => {
  res.json(VelqoarathApiService.getEconomicIndicators());
});

app.get('/api/economic-observations', (_req, res) => {
  res.json(VelqoarathApiService.getEconomicObservations());
});

app.get('/api/central-banks', (_req, res) => {
  res.json(VelqoarathApiService.getCentralBanks());
});

app.get('/api/economic-events', (_req, res) => {
  res.json(VelqoarathApiService.getEconomicEvents());
});

app.get('/api/sessions', (_req, res) => {
  res.json(VelqoarathApiService.getSessions());
});

app.get('/api/sessions/current', (_req, res) => {
  res.json(VelqoarathApiService.getCurrentSessions());
});

app.get('/api/sessions/upcoming', (_req, res) => {
  res.json(VelqoarathApiService.getUpcomingSessions());
});

app.get('/api/session-intelligence/:symbol', (req, res) => {
  const result = VelqoarathApiService.getSessionIntelligence(req.params.symbol);
  if (!result) return res.status(404).json({ error: 'Session intelligence not found' });
  res.json(result);
});

app.get('/api/dashboard', (_req, res) => {
  res.json(VelqoarathApiService.getDashboard());
});

app.post('/api/data-feed/toggle', (req, res) => {
  const connected = req.body?.connected;
  res.json(VelqoarathApiService.toggleDataFeed(connected));
});

app.post('/api/thresholds', (req, res) => {
  const { strongThreshold, weakThreshold } = req.body;
  if (typeof strongThreshold !== 'number' || typeof weakThreshold !== 'number') {
    return res.status(400).json({ error: 'Invalid threshold values' });
  }
  res.json(VelqoarathApiService.updateThresholds(strongThreshold, weakThreshold));
});

// Vite Middleware for development
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VELQOARATH] Market Intelligence Server listening on port ${PORT}`);
  });
}

startServer();
