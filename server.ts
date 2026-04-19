import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mock Stock Market Trend API
  app.get('/api/stocks/trends', (req, res) => {
    const { category } = req.query;
    
    const data = {
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 1.25, trend: 'up' },
        { symbol: 'NVDA', name: 'NVIDIA Corp', price: 875.28, change: 4.15, trend: 'up' },
        { symbol: 'MSFT', name: 'Microsoft', price: 415.50, change: 0.85, trend: 'up' },
        { symbol: 'TSLA', name: 'Tesla, Inc.', price: 175.45, change: -2.10, trend: 'down' },
        { symbol: 'META', name: 'Meta Platforms', price: 495.20, change: 1.10, trend: 'up' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 152.65, change: -0.45, trend: 'down' }
      ],
      indices: [
        { symbol: 'S&P 500', name: 'SPX', price: 5120.45, change: 0.75, trend: 'up' },
        { symbol: 'Nasdaq', name: 'IXIC', price: 16250.30, change: 1.15, trend: 'up' },
        { symbol: 'Dow Jones', name: 'DJI', price: 38905.15, change: 0.35, trend: 'up' },
        { symbol: 'FTSE 100', name: 'UKX', price: 7910.20, change: -0.25, trend: 'down' }
      ],
      currency: [
        { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.0845, change: -0.15, trend: 'down' },
        { symbol: 'GBP/USD', name: 'British Pound / USD', price: 1.2650, change: 0.10, trend: 'up' },
        { symbol: 'USD/JPY', name: 'US Dollar / Yen', price: 151.25, change: 0.45, trend: 'up' },
        { symbol: 'BTC/USD', name: 'Bitcoin / USD', price: 68500.00, change: 2.50, trend: 'up' }
      ]
    };

    if (category && data[category as keyof typeof data]) {
      res.json(data[category as keyof typeof data]);
    } else {
      res.json(data.stocks);
    }
  });

  // Mock Price Comparison API
  app.get('/api/compare-prices', (req, res) => {
    const { item } = req.query;
    res.json([
      { source: 'Amazon', price: 299.99, url: 'https://amazon.com' },
      { source: 'Shopee', price: 275.50, url: 'https://shopee.com' },
      { source: 'Lazada', price: 280.00, url: 'https://lazada.com' }
    ]);
  });

  // Educational Content API
  app.get('/api/education/videos', (req, res) => {
    const allVideos = [
      { id: 'kYJj_-Z2Vw4', title: '7 Steps to Financial Independence', url: 'https://www.youtube.com/watch?v=kYJj_-Z2Vw4', thumbnail: 'https://img.youtube.com/vi/kYJj_-Z2Vw4/maxresdefault.jpg' },
      { id: 'sVKQn2I4HDM', title: 'How to Budget (The 50/30/20 Rule)', url: 'https://www.youtube.com/watch?v=sVKQn2I4HDM', thumbnail: 'https://img.youtube.com/vi/sVKQn2I4HDM/maxresdefault.jpg' },
      { id: 'Z7D_H98_vS0', title: 'Financial Independence for Beginners', url: 'https://www.youtube.com/watch?v=Z7D_H98_vS0', thumbnail: 'https://img.youtube.com/vi/Z7D_H98_vS0/maxresdefault.jpg' },
      { id: '6vYyG_iR_fI', title: 'The Psychology of Money', url: 'https://www.youtube.com/watch?v=6vYyG_iR_fI', thumbnail: 'https://img.youtube.com/vi/6vYyG_iR_fI/maxresdefault.jpg' },
      { id: 'Lp7E973zozc', title: 'Mastering Compound Interest', url: 'https://www.youtube.com/watch?v=Lp7E973zozc', thumbnail: 'https://img.youtube.com/vi/Lp7E973zozc/maxresdefault.jpg' },
      { id: 'h6scv37B0Yk', title: 'Stock Market Explained', url: 'https://www.youtube.com/watch?v=h6scv37B0Yk', thumbnail: 'https://img.youtube.com/vi/h6scv37B0Yk/maxresdefault.jpg' }
    ];
    // Shuffle and pick 3
    const shuffled = allVideos.sort(() => 0.5 - Math.random());
    res.json(shuffled.slice(0, 3));
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
