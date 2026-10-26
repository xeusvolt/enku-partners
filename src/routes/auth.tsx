// Authentication Routes for Enku Partners
import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { DbClient } from '../db/client';
import { hashPassword, verifyPassword, createSessionToken } from '../lib/auth';
import { normalizeEthiopianPhone, isValidEthiopianPhone } from '../lib/phone';
import { SESSION_COOKIE_NAME, getSessionSecret, getCurrentUser } from '../middleware/auth';
import { LoginView, RegisterView, PendingApprovalView, SuspendedView } from '../views/auth_views';
import type { Env } from '../types';

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.get('/login', async (c) => {
  const user = await getCurrentUser(c);
  if (user) {
    if (user.role === 'admin') return c.redirect('/admin');
    if (user.status === 'pending') return c.redirect('/pending-approval');
    if (user.status === 'suspended') return c.redirect('/suspended');
    return c.redirect('/partner');
  }
  return c.html(<LoginView />);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const rawPhone = String(body.phone_number || '').trim();
  const password = String(body.password || '');

  const phone = normalizeEthiopianPhone(rawPhone);
  if (!phone) {
    return c.html(<LoginView error="Please enter a valid Ethiopian phone number (e.g. 0911223344 or 0711223344)." phone={rawPhone} />, 400);
  }

  const db = new DbClient(c.env.DB);
  const user = await db.getUserByPhone(phone);
  if (!user) {
    return c.html(<LoginView error="Invalid phone number or password." phone={rawPhone} />, 401);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.html(<LoginView error="Invalid phone number or password." phone={rawPhone} />, 401);
  }

  // Generate secure signed session token
  const secret = getSessionSecret(c);
  const token = await createSessionToken(
    {
      userId: user.id,
      role: user.role,
      phone: user.phone_number,
      firstName: user.first_name,
      status: user.status
    },
    secret
  );

  const isProduction = c.env.ENVIRONMENT === 'production';
  setCookie(c, SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    maxAge: 7 * 24 * 3600
  });

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

authRoutes.get('/register', (c) => {
  return c.html(<RegisterView />);
});

authRoutes.post('/register', async (c) => {
  const body = await c.req.parseBody();
  const firstName = String(body.first_name || '').trim();
  const fatherName = String(body.father_name || '').trim();
  const rawPhone = String(body.phone_number || '').trim();
  const email = String(body.email || '').trim() || null;
  const password = String(body.password || '');

  const formData = { first_name: firstName, father_name: fatherName, phone_number: rawPhone, email: email || undefined };

  if (!firstName || !fatherName) {
    return c.html(<RegisterView error="First name and Father's name are required." formData={formData} />, 400);
  }

  const phone = normalizeEthiopianPhone(rawPhone);
  if (!phone) {
    return c.html(
      <RegisterView
        error="Invalid Ethiopian mobile number. Format must be 09XXXXXXXX, 07XXXXXXXX or +251..."
        formData={formData}
      />,
      400
    );
  }

  if (password.length < 6) {
    return c.html(
      <RegisterView error="Password must be at least 6 characters in length." formData={formData} />,
      400
    );
  }

  const db = new DbClient(c.env.DB);
  const existing = await db.getUserByPhone(phone);
  if (existing) {
    return c.html(
      <RegisterView
        error="An account with this phone number already exists. Please sign in."
        formData={formData}
      />,
      409
    );
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();

  const user = await db.createUser({
    id: userId,
    role: 'partner',
    first_name: firstName,
    father_name: fatherName,
    email,
    phone_number: phone,
    password_hash: passwordHash,
    status: 'pending'
  });

  // Automatically sign in with pending status
  const secret = getSessionSecret(c);
  const token = await createSessionToken(
    {
      userId: user.id,
      role: user.role,
      phone: user.phone_number,
      firstName: user.first_name,
      status: user.status
    },
    secret
  );

  const isProduction = c.env.ENVIRONMENT === 'production';
  setCookie(c, SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Lax',
    maxAge: 7 * 24 * 3600
  });

  return c.redirect('/pending-approval');
});

authRoutes.get('/pending-approval', async (c) => {
  const user = await getCurrentUser(c);
  if (user && user.status === 'active') {
    return c.redirect('/partner');
  }
  return c.html(<PendingApprovalView firstName={user?.first_name || 'Partner'} />);
});

authRoutes.get('/suspended', (c) => {
  return c.html(<SuspendedView />);
});

authRoutes.get('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' });
  return c.redirect('/login');
});
