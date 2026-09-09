import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppContext } from './types';
import { auth } from './routes/auth';
import { admin } from './routes/admin';
import { poems } from './routes/poems';
import { student } from './routes/student';
import { assignments } from './routes/assignments';

const app = new Hono<AppContext>();

// CORS configuration for Cloudflare Workers
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// Health check endpoint
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'zxt-api', time: new Date().toISOString() }));

// Mount modular sub-routers
app.route('/', auth);
app.route('/', admin);
app.route('/', poems);
app.route('/', student);
app.route('/', assignments);

export default app;
