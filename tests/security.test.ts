// Security & Integration E2E Test Suite for Enku Partners
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { createSessionToken } from '../src/lib/auth';
import { SESSION_COOKIE_NAME } from '../src/middleware/auth';
import type { User, Env, Referral } from '../src/types';

// Mock test-isolated environment
const TEST_SESSION_SECRET = 'test_secure_session_secret_min_32_bytes_enku_2026_x';
const TEST_ADMIN_PHONE = '0900000001';
const TEST_ADMIN_PASSWORD = 'MockTestAdminPassword123!';

function createMockD1Database(users: User[] = [], referrals: Referral[] = []): D1Database {
  return {
    prepare(query: string) {
      let boundArgs: any[] = [];
      const stmt = {
        bind(...args: any[]) {
          boundArgs = args;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.includes('FROM users WHERE id = ?')) {
            const user = users.find((u) => u.id === boundArgs[0]);
            return (user as T) || null;
          }
          if (query.includes('FROM users WHERE phone_number = ?')) {
            const user = users.find((u) => u.phone_number === boundArgs[0]);
            return (user as T) || null;
          }
          if (query.includes('FROM referrals WHERE phone_number = ?')) {
            const ref = referrals.find(
              (r) => r.phone_number === boundArgs[0] && (r.status === 'pending' || r.status === 'approved')
            );
            return (ref as T) || null;
          }
          return null;
        },
        async all<T = unknown>(): Promise<D1Result<T>> {
          return { results: [] as T[], success: true, meta: { changes: 0 } as any };
        },
        async run(): Promise<D1Response> {
          return { success: true, meta: { changes: 1 } as any };
        }
      };
      return stmt as any;
    },
    async batch(statements: any[]) {
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
    async exec() {
      return { count: 0, duration: 0 };
    },
    dump() {
      return Promise.resolve(new ArrayBuffer(0));
    }
  } as unknown as D1Database;
}

describe('Automated Security & E2E Testing Suite', () => {
  let partnerUser: User;
  let partnerCookie: string;
  let mockEnv: Env;

  beforeEach(async () => {
    partnerUser = {
      id: 'partner-uuid-sec-01',
      role: 'partner',
      first_name: 'Abebe',
      father_name: 'Bikila',
      email: 'abebe.test@enku.com',
      phone_number: '0912345678',
      password_hash: 'mock_salt:mock_hash',
      status: 'active',
      created_at: new Date().toISOString()
    };

    const mockDb = createMockD1Database([partnerUser]);

    mockEnv = {
      DB: mockDb,
      SESSION_SECRET: TEST_SESSION_SECRET,
      ENVIRONMENT: 'test',
      BASE_URL: 'http://localhost:8787',
      ADMIN_PHONE: TEST_ADMIN_PHONE,
      ADMIN_PASSWORD: TEST_ADMIN_PASSWORD
    };

    const sessionToken = await createSessionToken(
      {
        userId: partnerUser.id,
        role: partnerUser.role,
        phone: partnerUser.phone_number,
        firstName: partnerUser.first_name,
        status: partnerUser.status
      },
      TEST_SESSION_SECRET
    );

    partnerCookie = `${SESSION_COOKIE_NAME}=${sessionToken}`;
  });

  // Test 1: Auth Bypass (SQLi Injection in Login)
  it('1. Auth Bypass: Rejects admin login with SQLi payload and invalid credentials (401)', async () => {
    // Attempt SQLi injection in phone_number field
    const sqliPhoneRes = await app.request(
      '/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          phone_number: "' OR 1=1 --",
          password: 'IncorrectPassword123!'
        }).toString()
      },
      mockEnv
    );

    expect(sqliPhoneRes.status).toBe(401);

    // Attempt SQLi injection in password field against admin phone
    const sqliPassRes = await app.request(
      '/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          phone_number: TEST_ADMIN_PHONE,
          password: "' OR 1=1 --"
        }).toString()
      },
      mockEnv
    );

    expect(sqliPassRes.status).toBe(401);
  });

  // Test 2: XSS Protection in Lead Submission
  it("2. XSS Protection: Rejects lead submission with script injection in full_name (400)", async () => {
    const xssPayloadRes = await app.request(
      '/partner/leads/new',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: partnerCookie
        },
        body: new URLSearchParams({
          full_name: "<script>alert('xss')</script>",
          phone_number: '0988776655',
          role_type: 'Customer'
        }).toString()
      },
      mockEnv
    );

    expect(xssPayloadRes.status).toBe(400);
    const bodyText = await xssPayloadRes.text();
    expect(bodyText).toContain('Invalid characters or script tags detected');
  });

  // Test 3: Role-Based Access Control (RBAC) Enforcement
  it('3. RBAC: Forbids standard partner from accessing admin batch payout generation (403)', async () => {
    const rbacRes = await app.request(
      '/admin/payouts/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: partnerCookie
        },
        body: new URLSearchParams({
          referral_ids: 'ref-01'
        }).toString()
      },
      mockEnv
    );

    expect(rbacRes.status).toBe(403);
    const text = await rbacRes.text();
    expect(text).toContain('Forbidden: Administrator privileges required.');
  });

  // Test 4: Anti-Fraud Self-Referral Prevention
  it("4. Anti-Fraud: Rejects lead submission matching partner's own registered phone (400)", async () => {
    const selfReferralRes = await app.request(
      '/partner/leads/new',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: partnerCookie
        },
        body: new URLSearchParams({
          full_name: 'Almaz Ayana',
          phone_number: partnerUser.phone_number, // Matching partner's own phone
          role_type: 'Customer'
        }).toString()
      },
      mockEnv
    );

    expect(selfReferralRes.status).toBe(400);
    const bodyText = await selfReferralRes.text();
    expect(bodyText).toContain('Self-referral violation');
  });
});
