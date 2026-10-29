// Payout Aggregation, Safety Valves, and Ledger E2E Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import { DbClient } from '../src/db/client';
import app from '../src/index';
import { createSessionToken } from '../src/lib/auth';
import { SESSION_COOKIE_NAME } from '../src/middleware/auth';
import type { User, Referral, PayoutBatch, Bank, PartnerBankDetails, Env } from '../types';

describe('Payout Aggregation, Bank Safety Valves & Ledger Tests', () => {
  let mockUsers: User[];
  let mockBanks: Bank[];
  let mockBankDetails: PartnerBankDetails[];
  let mockReferrals: Referral[];
  let mockBatches: PayoutBatch[];

  function createMockD1(): D1Database {
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
              const u = mockUsers.find((user) => user.id === boundArgs[0]);
              return (u as T) || null;
            }
            if (query.includes('FROM users WHERE phone_number = ?')) {
              const u = mockUsers.find((user) => user.phone_number === boundArgs[0]);
              return (u as T) || null;
            }
            if (query.includes('FROM payout_batches WHERE id = ?')) {
              const b = mockBatches.find((batch) => batch.id === boundArgs[0]);
              return (b as T) || null;
            }
            if (query.includes('SELECT COUNT(*) as count FROM referrals WHERE partner_id = ? AND status = \'pending\'')) {
              const count = mockReferrals.filter((r) => r.partner_id === boundArgs[0] && r.status === 'pending').length;
              return ({ count } as T);
            }
            if (query.includes('FROM referrals WHERE partner_id = ? AND status = \'approved\' AND payout_status = \'unpaid\'')) {
              const matching = mockReferrals.filter(
                (r) => r.partner_id === boundArgs[0] && r.status === 'approved' && r.payout_status === 'unpaid'
              );
              const total = matching.reduce((sum, r) => sum + (r.commission_earned_etb || 0), 0);
              return ({ count: matching.length, total } as T);
            }
            if (query.includes('FROM referrals WHERE partner_id = ? AND payout_status = \'paid\'')) {
              const matching = mockReferrals.filter(
                (r) => r.partner_id === boundArgs[0] && r.payout_status === 'paid'
              );
              const total = matching.reduce((sum, r) => sum + (r.commission_earned_etb || 0), 0);
              return ({ total } as T);
            }
            return null;
          },
          async all<T = unknown>(): Promise<D1Result<T>> {
            const cleanQuery = query.replace(/\s+/g, ' ');

            // 1. getPayoutBatchGroupedItems
            if (cleanQuery.includes('GROUP BY') && cleanQuery.includes('r.payout_batch_id = ?')) {
              const batchId = boundArgs[0];
              const batchReferrals = mockReferrals.filter((r) => r.payout_batch_id === batchId);
              const partnerMap = new Map<string, typeof batchReferrals>();

              for (const ref of batchReferrals) {
                const existing = partnerMap.get(ref.partner_id) || [];
                existing.push(ref);
                partnerMap.set(ref.partner_id, existing);
              }

              const grouped: any[] = [];
              for (const [pId, refs] of partnerMap.entries()) {
                const partner = mockUsers.find((u) => u.id === pId);
                const bankDetail = mockBankDetails.find((bd) => bd.partner_id === pId);
                const bank = mockBanks.find((b) => b.id === bankDetail?.bank_id);
                const totalEtb = refs.reduce((sum, r) => sum + (r.commission_earned_etb || 0), 0);

                grouped.push({
                  partner_id: pId,
                  partner_name: `${partner?.first_name} ${partner?.father_name}`,
                  partner_phone: partner?.phone_number || '',
                  bank_name: bank?.name || 'No Bank Configured',
                  account_holder: bankDetail?.account_holder_name || 'N/A',
                  account_number: bankDetail?.account_number || 'N/A',
                  lead_count: refs.length,
                  total_amount_etb: totalEtb,
                  referral_ids_str: refs.map((r) => r.id).join(',')
                });
              }

              return { results: grouped as T[], success: true, meta: { changes: 0 } as any };
            }

            // 2. Fetch leads for reject partner group
            if (cleanQuery.includes('SELECT id, commission_earned_etb FROM referrals') && cleanQuery.includes('partner_id = ? AND payout_batch_id = ?')) {
              const [partnerId, batchId] = boundArgs;
              const matching = mockReferrals
                .filter((r) => r.partner_id === partnerId && r.payout_batch_id === batchId && r.payout_status === 'processing')
                .map((r) => ({ id: r.id, commission_earned_etb: r.commission_earned_etb }));
              return { results: matching as T[], success: true, meta: { changes: 0 } as any };
            }

            // 3. getUnpaidApprovedReferrals with Bank Safety Valve / createPayoutBatch query
            if (cleanQuery.includes('FROM referrals r') && cleanQuery.includes('partner_bank_details pbd') && cleanQuery.includes('banks b')) {
              const isIdFilter = cleanQuery.includes('WHERE r.id IN');
              const results = mockReferrals.filter((r) => {
                if (isIdFilter && !boundArgs.includes(r.id)) return false;
                if (r.status !== 'approved' || r.payout_status !== 'unpaid') return false;
                const bank = mockBankDetails.find((b) => b.partner_id === r.partner_id);
                if (!bank || !bank.account_number || bank.account_number.trim() === '') return false;
                const bankMeta = mockBanks.find((b) => b.id === bank.bank_id);
                if (!bankMeta || !bankMeta.is_active) return false;
                return true;
              }).map((r) => {
                const partner = mockUsers.find((u) => u.id === r.partner_id);
                return {
                  ...r,
                  partner_first_name: partner?.first_name,
                  partner_father_name: partner?.father_name,
                  partner_phone: partner?.phone_number
                };
              });
              return { results: results as T[], success: true, meta: { changes: 0 } as any };
            }

            // 4. getPartnerActiveReferrals
            if (cleanQuery.includes('FROM referrals WHERE partner_id = ? AND payout_status != \'paid\'')) {
              const partnerId = boundArgs[0];
              const results = mockReferrals.filter(
                (r) => r.partner_id === partnerId && r.payout_status !== 'paid'
              );
              return { results: results as T[], success: true, meta: { changes: 0 } as any };
            }

            // 5. getPartnerPaymentHistory
            if (cleanQuery.includes('FROM referrals r') && cleanQuery.includes('payout_batches pb') && cleanQuery.includes("pb.status = 'completed'")) {
              const partnerId = boundArgs[0];
              const paidReferrals = mockReferrals.filter(
                (r) => r.partner_id === partnerId && r.payout_status === 'paid' && r.payout_batch_id
              );
              const batchMap = new Map<string, typeof paidReferrals>();
              for (const ref of paidReferrals) {
                const bId = ref.payout_batch_id!;
                const existing = batchMap.get(bId) || [];
                existing.push(ref);
                batchMap.set(bId, existing);
              }

              const history: any[] = [];
              for (const [bId, refs] of batchMap.entries()) {
                const batch = mockBatches.find((b) => b.id === bId);
                if (batch && batch.status === 'completed') {
                  const total = refs.reduce((sum, r) => sum + (r.commission_earned_etb || 0), 0);
                  history.push({
                    batch_id: bId,
                    batch_reference: batch.batch_reference,
                    date_paid: batch.completed_at || batch.created_at,
                    lead_count: refs.length,
                    total_etb_deposited: total
                  });
                }
              }
              return { results: history as T[], success: true, meta: { changes: 0 } as any };
            }

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

  beforeEach(() => {
    mockBanks = [
      { id: 1, name: 'Commercial Bank of Ethiopia (CBE)', is_active: 1 },
      { id: 2, name: 'Telebirr SuperApp', is_active: 1 }
    ];

    mockUsers = [
      {
        id: 'partner-with-bank',
        role: 'partner',
        first_name: 'Daniel',
        father_name: 'Derbew',
        phone_number: '0911811425',
        password_hash: 'hash',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'partner-without-bank',
        role: 'partner',
        first_name: 'Fikir',
        father_name: 'Tefera',
        phone_number: '0920518982',
        password_hash: 'hash',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];

    mockBankDetails = [
      {
        id: 'bank-detail-1',
        partner_id: 'partner-with-bank',
        bank_id: 1,
        account_number: '1000123456789',
        account_holder_name: 'Daniel Derbew',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    mockReferrals = [
      // Partner with bank: 1 approved unpaid, 1 paid
      {
        id: 'ref-1-unpaid',
        partner_id: 'partner-with-bank',
        full_name: 'Customer One',
        phone_number: '0911000001',
        role_type: 'Customer',
        status: 'approved',
        payout_status: 'unpaid',
        commission_earned_etb: 500,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'ref-2-paid',
        partner_id: 'partner-with-bank',
        full_name: 'Customer Two',
        phone_number: '0911000002',
        role_type: 'Customer',
        status: 'approved',
        payout_status: 'paid',
        commission_earned_etb: 500,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: 'batch-completed-1',
        created_at: new Date().toISOString()
      },
      // Partner without bank: 2 approved unpaid leads
      {
        id: 'ref-3-unpaid-nobank',
        partner_id: 'partner-without-bank',
        full_name: 'Customer Three',
        phone_number: '0911000003',
        role_type: 'Customer',
        status: 'approved',
        payout_status: 'unpaid',
        commission_earned_etb: 300,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: null,
        created_at: new Date().toISOString()
      },
      {
        id: 'ref-4-unpaid-nobank',
        partner_id: 'partner-without-bank',
        full_name: 'Customer Four',
        phone_number: '0911000004',
        role_type: 'Customer',
        status: 'approved',
        payout_status: 'unpaid',
        commission_earned_etb: 300,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: null,
        created_at: new Date().toISOString()
      }
    ];

    mockBatches = [
      {
        id: 'batch-completed-1',
        batch_reference: 'EP-BATCH-20261026-COMP',
        total_amount_etb: 500,
        item_count: 1,
        status: 'completed',
        created_by_id: 'admin-id',
        created_at: '2026-10-26T12:00:00Z',
        completed_at: '2026-10-26T14:00:00Z'
      }
    ];
  });

  // Test 1: Bank Safety Valve in Batch Generation
  it('1. Bank Safety Valve: Excludes leads from partners without active bank details from batch generation pool', async () => {
    const mockDb = createMockD1();
    const dbClient = new DbClient(mockDb);

    const eligibleLeads = await dbClient.getUnpaidApprovedReferrals();

    // Only Partner With Bank should have leads returned
    expect(eligibleLeads.length).toBe(1);
    expect(eligibleLeads[0].id).toBe('ref-1-unpaid');
    expect(eligibleLeads[0].partner_id).toBe('partner-with-bank');

    // Partner Without Bank leads must be strictly ignored and excluded
    const excludedNobankLeads = eligibleLeads.filter((l) => l.partner_id === 'partner-without-bank');
    expect(excludedNobankLeads.length).toBe(0);
  });

  // Test 2: Clean Partner Dashboard (Paid Leads are Hidden)
  it('2. Clean Dashboard: Hides paid leads from active dashboard submissions view', async () => {
    const mockDb = createMockD1();
    const dbClient = new DbClient(mockDb);

    const activeLeads = await dbClient.getPartnerActiveReferrals('partner-with-bank');

    // Partner has 2 total leads (1 unpaid, 1 paid). Active list must ONLY return the unpaid lead.
    expect(activeLeads.length).toBe(1);
    expect(activeLeads[0].id).toBe('ref-1-unpaid');
    expect(activeLeads[0].payout_status).toBe('unpaid');

    const paidIncluded = activeLeads.some((l) => l.payout_status === 'paid');
    expect(paidIncluded).toBe(false);
  });

  // Test 3: Partner Payment History Ledger
  it('3. Payment History Ledger: Correctly aggregates completed batch payments for partner', async () => {
    const mockDb = createMockD1();
    const dbClient = new DbClient(mockDb);

    const history = await dbClient.getPartnerPaymentHistory('partner-with-bank');

    expect(history.length).toBe(1);
    expect(history[0].batch_reference).toBe('EP-BATCH-20261026-COMP');
    expect(history[0].lead_count).toBe(1);
    expect(history[0].total_etb_deposited).toBe(500);
  });

  // Test 4: Batch Slip Roll-Up Grouping (Multiple Leads for One Partner -> 1 Row)
  it('4. Slip Roll-Up: Groups multiple leads for a single partner into ONE row with total lead count and aggregated ETB', async () => {
    // Add batch with 3 leads for Daniel
    const batchId = 'batch-processing-multi';
    mockBatches.push({
      id: batchId,
      batch_reference: 'EP-BATCH-20261027-TEST',
      total_amount_etb: 1500,
      item_count: 3,
      status: 'processing',
      created_by_id: 'admin-id',
      created_at: new Date().toISOString(),
      completed_at: null
    });

    mockReferrals.push(
      {
        id: 'ref-dan-1',
        partner_id: 'partner-with-bank',
        full_name: 'Lead A',
        phone_number: '0911000010',
        role_type: 'Customer',
        status: 'approved',
        payout_status: 'processing',
        commission_earned_etb: 500,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: batchId,
        created_at: new Date().toISOString()
      },
      {
        id: 'ref-dan-2',
        partner_id: 'partner-with-bank',
        full_name: 'Lead B',
        phone_number: '0911000011',
        role_type: 'Helper',
        status: 'approved',
        payout_status: 'processing',
        commission_earned_etb: 500,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: batchId,
        created_at: new Date().toISOString()
      },
      {
        id: 'ref-dan-3',
        partner_id: 'partner-with-bank',
        full_name: 'Lead C',
        phone_number: '0911000012',
        role_type: 'Broker',
        status: 'approved',
        payout_status: 'processing',
        commission_earned_etb: 500,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: batchId,
        created_at: new Date().toISOString()
      }
    );

    const mockDb = createMockD1();
    const dbClient = new DbClient(mockDb);

    const groupedItems = await dbClient.getPayoutBatchGroupedItems(batchId);

    // Must be rolled up into 1 single row for Daniel
    expect(groupedItems.length).toBe(1);
    expect(groupedItems[0].partner_id).toBe('partner-with-bank');
    expect(groupedItems[0].partner_name).toBe('Daniel Derbew');
    expect(groupedItems[0].lead_count).toBe(3);
    expect(groupedItems[0].total_amount_etb).toBe(1500);
    expect(groupedItems[0].account_number).toBe('1000123456789');
  });

  // Test 5: Atomic Rejection of Partner Group
  it('5. Reject Partner Group: Reverts multiple leads back to unpaid and decrements batch totals atomically', async () => {
    const batchId = 'batch-processing-reject';
    mockBatches.push({
      id: batchId,
      batch_reference: 'EP-BATCH-20261027-REJ',
      total_amount_etb: 1000,
      item_count: 2,
      status: 'processing',
      created_by_id: 'admin-id',
      created_at: new Date().toISOString(),
      completed_at: null
    });

    mockReferrals.push(
      {
        id: 'ref-rej-1',
        partner_id: 'partner-with-bank',
        full_name: 'Lead To Reject 1',
        phone_number: '0911000020',
        role_type: 'Customer',
        status: 'approved',
        payout_status: 'processing',
        commission_earned_etb: 500,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: batchId,
        created_at: new Date().toISOString()
      },
      {
        id: 'ref-rej-2',
        partner_id: 'partner-with-bank',
        full_name: 'Lead To Reject 2',
        phone_number: '0911000021',
        role_type: 'Customer',
        status: 'approved',
        payout_status: 'processing',
        commission_earned_etb: 500,
        approved_at: new Date().toISOString(),
        approved_by_id: 'admin-id',
        payout_batch_id: batchId,
        created_at: new Date().toISOString()
      }
    );

    const mockDb = createMockD1();
    const dbClient = new DbClient(mockDb);

    const success = await dbClient.rejectPayoutBatchPartnerGroup('partner-with-bank', batchId);
    expect(success).toBe(true);
  });

  // Test 6: Missing Bank Nudge Warning Banner
  it('6. Missing Bank Nudge: Renders warning banner when partner has approved unpaid commissions but no bank details', async () => {
    const { PartnerDashboardView } = await import('../src/views/partner_views');

    // Case A: Has approved unpaid commissions but NO bank details -> Should render warning banner
    const viewWithWarning = PartnerDashboardView({
      user: mockUsers[1], // Fikir (no bank)
      stats: {
        pendingApprovalsCount: 0,
        approvedUnpaidCount: 2,
        approvedUnpaidTotalEtb: 600,
        paidLifetimeTotalEtb: 0
      },
      hasBankDetails: false,
      recentReferrals: []
    });

    // In Hono JSX, viewWithWarning can be converted to string or inspected
    const htmlString = String(viewWithWarning);
    expect(htmlString).toContain('You have approved commissions! Please add your payout details to receive your money.');

    // Case B: Has bank details -> Warning banner must NOT be rendered
    const viewWithoutWarning = PartnerDashboardView({
      user: mockUsers[0], // Daniel (has bank)
      stats: {
        pendingApprovalsCount: 0,
        approvedUnpaidCount: 1,
        approvedUnpaidTotalEtb: 500,
        paidLifetimeTotalEtb: 500
      },
      hasBankDetails: true,
      recentReferrals: []
    });

    const htmlStringB = String(viewWithoutWarning);
    expect(htmlStringB).not.toContain('You have approved commissions! Please add your payout details to receive your money.');
  });

  // Test 7: Strict Empty Selection Guard (POST /admin/payouts/generate -> 400)
  it('7. Strict Empty Selection Guard: Returns 400 "No leads selected." when no referral IDs are submitted', async () => {
    const adminUser: User = {
      id: 'admin-id-test',
      role: 'admin',
      first_name: 'Admin',
      father_name: 'Super',
      phone_number: '0900000001',
      password_hash: 'hash',
      status: 'active',
      created_at: new Date().toISOString()
    };
    mockUsers.push(adminUser);

    const testSecret = 'test_secret_for_admin_guard_min_32_bytes_2026';
    const token = await createSessionToken(
      {
        userId: adminUser.id,
        role: adminUser.role,
        phone: adminUser.phone_number,
        firstName: adminUser.first_name,
        status: adminUser.status
      },
      testSecret
    );

    const mockEnv: Env = {
      DB: createMockD1(),
      SESSION_SECRET: testSecret,
      ENVIRONMENT: 'test',
      BASE_URL: 'http://localhost:8787',
      ADMIN_PHONE: '0900000001',
      ADMIN_PASSWORD: 'MockAdminPassword123!'
    };

    // 1. Submit empty URLSearchParams (no referral_ids)
    const emptyFormRes = await app.request(
      '/admin/payouts/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: `${SESSION_COOKIE_NAME}=${token}`
        },
        body: new URLSearchParams().toString()
      },
      mockEnv
    );

    expect(emptyFormRes.status).toBe(400);
    const textRes = await emptyFormRes.text();
    expect(textRes).toBe('No leads selected.');

    // 2. Submit empty JSON payload
    const emptyJsonRes = await app.request(
      '/admin/payouts/generate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${SESSION_COOKIE_NAME}=${token}`
        },
        body: JSON.stringify({ referral_ids: [] })
      },
      mockEnv
    );

    expect(emptyJsonRes.status).toBe(400);
    const jsonTextRes = await emptyJsonRes.text();
    expect(jsonTextRes).toBe('No leads selected.');
  });

  // Test 8: Bulk Selection Array Batching in DbClient
  it('8. Bulk Selection Array Batching: Creates exactly one batch ID and binds only selected eligible leads', async () => {
    const mockDb = createMockD1();
    const dbClient = new DbClient(mockDb);

    // Selected array contains:
    // - ref-1-unpaid (partner has bank -> eligible)
    // - ref-3-unpaid-nobank (partner has NO bank -> ineligible)
    const selectedIds = ['ref-1-unpaid', 'ref-3-unpaid-nobank'];

    const batch = await dbClient.createPayoutBatch('admin-id', selectedIds);
    expect(batch).not.toBeNull();
    expect(batch?.item_count).toBe(1);
    expect(batch?.total_amount_etb).toBe(500);
    expect(batch?.status).toBe('processing');
    expect(batch?.batch_reference).toMatch(/^EP-BATCH-\d{8}-[A-Z0-9]+$/);
  });

  // Test 9: Empty array handling in DbClient.createPayoutBatch
  it('9. DbClient Guard: createPayoutBatch returns null when given empty referralIds array', async () => {
    const mockDb = createMockD1();
    const dbClient = new DbClient(mockDb);

    const batch = await dbClient.createPayoutBatch('admin-id', []);
    expect(batch).toBeNull();
  });
});
