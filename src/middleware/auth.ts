// Authentication & Authorization Middleware for Hono
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifySessionToken } from '../lib/auth';
import { DbClient } from '../db/client';
import type { Env, User } from '../types';

export const SESSION_COOKIE_NAME = 'enku_session';

export function getSessionSecret(c: Context<any>): string {
  const secret = c.env?.SESSION_SECRET;
  if (!secret) {
    if (c.env?.ENVIRONMENT === 'production') {
      throw new Error('FATAL SECURITY ERROR: SESSION_SECRET binding is required in production.');
    }
    return 'enku_partners_dev_super_secret_session_key_min_32_bytes_2026_x';
  }
  return secret;
}

export async function getCurrentUser(c: Context<any>): Promise<User | null> {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) return null;

  const secret = getSessionSecret(c);
  const session = await verifySessionToken(token, secret);
  if (!session) return null;

  const db = new DbClient(c.env.DB);
  const user = await db.getUserById(session.userId);
  return user;
}

/**
 * Middleware: Requires an authenticated user session.
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.redirect('/login');
  }
  c.set('user', user);
  await next();
}

/**
 * Middleware: Requires partner role.
 * If status is 'pending', redirects to '/pending-approval'.
 * If status is 'suspended', redirects to '/suspended'.
 */
export async function requirePartner(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.redirect('/login');
  }

  if (user.role !== 'partner') {
    if (user.role === 'admin') {
      return c.redirect('/admin');
    }
    return c.redirect('/login');
  }

  if (user.status === 'pending') {
    return c.redirect('/pending-approval');
  }

  if (user.status === 'suspended') {
    return c.redirect('/suspended');
  }

  c.set('user', user);
  await next();
}

/**
 * Middleware: Requires admin role.
 */
export async function requireAdmin(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: Next) {
  const user = await getCurrentUser(c);
  if (!user) {
    return c.redirect('/login');
  }

  if (user.role !== 'admin') {
    return c.redirect('/partner');
  }

  c.set('user', user);
  await next();
}
