// Authentication Routes for Enku Partners
import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { DbClient } from '../db/client';
import { hashPassword, verifyPassword, createSessionToken, timingSafeEqualStr } from '../lib/auth';
import { normalizeEthiopianPhone, isValidEthiopianPhone } from '../lib/phone';
import { SESSION_COOKIE_NAME, getSessionSecret, getCurrentUser } from '../middleware/auth';
import {
  LoginView,
  RegisterView,
  PendingApprovalView,
  SuspendedView,
  ForgotPasswordView,
  ResetPasswordView
} from '../views/auth_views';
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
  const msg = c.req.query('msg');
  const error = c.req.query('error');
  return c.html(<LoginView message={msg} error={error} />);
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.parseBody();
  const rawPhone = String(body.phone_number || '').trim();
  const password = String(body.password || '');

  const phone = normalizeEthiopianPhone(rawPhone);
  if (!phone) {
    return c.html(<LoginView error="Invalid phone number or password." phone={rawPhone} />, 401);
  }

  const isProduction = c.env.ENVIRONMENT === 'production';
  const secret = getSessionSecret(c);
  const db = new DbClient(c.env.DB);

  // 1. Dynamic Root Admin Ghost Authentication via Environment Secret Bindings
  const adminPhone = c.env.ADMIN_PHONE ? normalizeEthiopianPhone(c.env.ADMIN_PHONE) : null;
  const adminPassword = c.env.ADMIN_PASSWORD || null;

  if (adminPhone && adminPassword && timingSafeEqualStr(phone, adminPhone) && timingSafeEqualStr(password, adminPassword)) {
    // Admin credentials verified against environment secret vault
    let adminUser = await db.getUserByPhone(phone);
    if (!adminUser) {
      const adminId = crypto.randomUUID();
      adminUser = await db.createUser({
        id: adminId,
        role: 'admin',
        first_name: 'Admin',
        father_name: 'Enku',
        email: null,
        phone_number: phone,
        password_hash: 'ENV_MANAGED',
        status: 'active'
      });
    } else if (adminUser.role !== 'admin' || adminUser.status !== 'active') {
      await db.promoteUserToAdmin(adminUser.id);
      adminUser.role = 'admin';
      adminUser.status = 'active';
    }

    const token = await createSessionToken(
      {
        userId: adminUser.id,
        role: 'admin',
        phone: adminUser.phone_number,
        firstName: adminUser.first_name,
        status: 'active'
      },
      secret
    );

    setCookie(c, SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
      maxAge: 7 * 24 * 3600
    });

    return c.redirect('/admin');
  }

  // 2. Fall back to standard Partner database authentication
  const user = await db.getUserByPhone(phone);
  if (!user) {
    return c.html(<LoginView error="Invalid phone number or password." phone={rawPhone} />, 401);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return c.html(<LoginView error="Invalid phone number or password." phone={rawPhone} />, 401);
  }

  // Generate secure signed session token
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

// ============================================================
// Admin-Gated Password Reset Flow
// ============================================================

authRoutes.get('/forgot-password', async (c) => {
  const user = await getCurrentUser(c);
  if (user) {
    if (user.role === 'admin') return c.redirect('/admin');
    return c.redirect('/partner');
  }
  return c.html(<ForgotPasswordView />);
});

authRoutes.post('/forgot-password', async (c) => {
  const body = await c.req.parseBody();
  const rawPhone = String(body.phone_number || '').trim();
  const phone = normalizeEthiopianPhone(rawPhone);

  if (!phone) {
    return c.html(
      <ForgotPasswordView
        error="Please enter a valid Ethiopian phone number (e.g. 0911223344 or 0711223344)."
        phone={rawPhone}
      />,
      400
    );
  }

  const db = new DbClient(c.env.DB);
  const user = await db.getUserByPhone(phone);

  // If user exists, queue an admin-approval reset request
  if (user) {
    await db.createPasswordResetRequest(user.id);
  }

  // Consistent message to prevent phone number enumeration
  return c.html(
    <ForgotPasswordView
      message="If your phone number is registered with an approved partner account, your password reset request has been queued for administrative review. You will receive an SMS with your one-time reset link once approved."
    />
  );
});

// Helper to validate and retrieve reset token with timing attack mitigation
async function validateResetToken(db: DbClient, token: string) {
  const isValidFormat = typeof token === 'string' && /^[0-9a-fA-F]{64}$/.test(token);

  let resetRecord = null;
  if (isValidFormat) {
    resetRecord = await db.getPasswordResetByToken(token.toLowerCase());
  }

  // Constant-time string comparison to mitigate timing attacks
  const storedToken = resetRecord?.reset_token || '0'.repeat(64);
  const candidateToken = isValidFormat ? token.toLowerCase() : '1'.repeat(64);
  const tokenMatch = timingSafeEqualStr(storedToken, candidateToken) && resetRecord !== null;

  const isApproved = resetRecord?.status === 'approved';
  const isNotExpired =
    resetRecord?.expires_at !== null &&
    resetRecord?.expires_at !== undefined &&
    new Date(resetRecord.expires_at).getTime() > Date.now();

  const isValid = tokenMatch && isApproved && isNotExpired;

  return {
    isValid,
    resetRecord: isValid ? resetRecord : null,
    isExpired: isApproved && !isNotExpired
  };
}

authRoutes.get('/reset', async (c) => {
  const token = String(c.req.query('token') || '').trim();
  if (!token) {
    return c.html(<ResetPasswordView token="" isValid={false} error="Missing password reset token." />);
  }

  const db = new DbClient(c.env.DB);
  const { isValid, isExpired } = await validateResetToken(db, token);

  if (!isValid) {
    return c.html(
      <ResetPasswordView
        token={token}
        isValid={false}
        error={
          isExpired
            ? 'This password reset link has expired (1 hour limit). Please request a new one.'
            : 'This password reset link is invalid or has already been used.'
        }
      />
    );
  }

  return c.html(<ResetPasswordView token={token} isValid={true} />);
});

authRoutes.post('/reset', async (c) => {
  const body = await c.req.parseBody();
  const token = String(body.token || '').trim();
  const password = String(body.password || '');
  const confirmPassword = String(body.confirm_password || '');

  const db = new DbClient(c.env.DB);
  const { isValid, resetRecord, isExpired } = await validateResetToken(db, token);

  if (!isValid || !resetRecord) {
    return c.html(
      <ResetPasswordView
        token={token}
        isValid={false}
        error={
          isExpired
            ? 'This password reset link has expired (1 hour limit). Please request a new one.'
            : 'This password reset link is invalid or has already been used.'
        }
      />,
      400
    );
  }

  if (password.length < 8) {
    return c.html(
      <ResetPasswordView
        token={token}
        isValid={true}
        error="Password must be at least 8 characters in length."
      />,
      400
    );
  }

  if (password !== confirmPassword) {
    return c.html(
      <ResetPasswordView
        token={token}
        isValid={true}
        error="Passwords do not match. Please verify and re-enter."
      />,
      400
    );
  }

  // Hash new password using Web Crypto PBKDF2/SHA-256
  const newHash = await hashPassword(password);

  // Mark token as used and update user password atomically
  const success = await db.completePasswordReset(resetRecord.id, resetRecord.user_id, newHash);
  if (!success) {
    return c.html(
      <ResetPasswordView
        token={token}
        isValid={true}
        error="Failed to update password. Please try again or request a new reset link."
      />,
      500
    );
  }

  return c.redirect('/login?msg=Password+reset+successful.+Please+sign+in+with+your+new+password.');
});
