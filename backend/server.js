// Polyfill globalThis.WebSocket for Node < 22 environments where @supabase/realtime-js expects it
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '.env') });

const { supabaseAdmin } = require('./utils/supabaseAdmin');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { attachLiveWebSocketServer } = require('./src/live/liveWsServer');

const app = express();
const PORT = process.env.PORT || 5000;

// Log Supabase initialization status
if (supabaseAdmin) {
  console.log('⚡ Supabase client initialized (PostgreSQL + Auth + pgvector)');
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in backend/.env');
}

// Core Middleware — allow configured production frontend URL(s), Netlify deploys, and local dev
const configuredOrigins = [process.env.CLIENT_URL, process.env.FRONTEND_URL]
  .filter(Boolean)
  .flatMap((raw) => raw.split(','))
  .map((u) => u.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/+$/, '');
      if (
        configuredOrigins.includes(clean) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(clean) ||
        /^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(clean)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes index (Task 1.4)
app.use('/api', routes);

// 404 Not Found handler for unmapped routes
app.use(notFoundHandler);

// Central error-handling middleware (Task 1.5)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Attach Live Class WebSocket relay (/ws/live)
attachLiveWebSocketServer(server);

module.exports = { app, server };
