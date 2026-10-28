// Enku Partners — Cloudflare Workers / Pages Main Application Entry
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { authRoutes } from './routes/auth';
import { partnerRoutes } from './routes/partner';
import { adminRoutes } from './routes/admin';
import { getCurrentUser } from './middleware/auth';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Security Headers: Strict Transport Security (HSTS), MIME Protection, Frame Isolation
app.use('*', secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN',
  referrerPolicy: 'strict-origin-when-cross-origin'
}));

// Root Route: Redirects based on authentication status & role
app.get('/', async (c) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.redirect('/login');
  }
  if (user.role === 'admin') {
    return c.redirect('/admin');
  }
  if (user.status === 'pending') {
    return c.redirect('/pending-approval');
  }
  if (user.status === 'suspended') {
    return c.redirect('/suspended');
  }
  return c.redirect('/partner');
});

// Mount modular sub-routers
app.route('/', authRoutes);
app.route('/partner', partnerRoutes);
app.route('/admin', adminRoutes);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'enku-partners', timestamp: new Date().toISOString() });
});

// 404 Handler
app.notFound((c) => {
  return c.html(
    <html lang="en" class="h-full bg-black text-white">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 — Page Not Found</title>
        <link rel="stylesheet" href="/static/css/styles.css" />
      </head>
      <body class="h-full flex items-center justify-center p-4 bg-black text-white">
        <div class="text-center max-w-sm">
          <div class="w-12 h-12 bg-white text-black font-bold text-lg rounded-sm mx-auto flex items-center justify-center mb-4">
            EP
          </div>
          <h1 class="text-xl font-bold tracking-tight mb-2">404 — NOT FOUND</h1>
          <p class="text-xs text-[#888888] mb-6">The requested executive portal page does not exist or has been relocated.</p>
          <a
            href="/"
            class="px-5 py-2.5 bg-white text-black font-semibold text-xs uppercase tracking-wider rounded inline-block"
          >
            Return to Safety
          </a>
        </div>
      </body>
    </html>,
    404
  );
});

export default app;
