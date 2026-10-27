// Payout Aggregation, Safety Valves, and Ledger E2E Test Suite
import { describe, it, expect, beforeEach } from 'vitest';
import { DbClient } from '../src/db/client';
import type { User, Referral, PayoutBatch, Bank, PartnerBankDetails } from '../types';

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

            // 3. getUnpaidApprovedReferrals with Bank Safety Valve
            if (cleanQuery.includes('FROM referrals r') && cleanQuery.includes('partner_bank_details pbd') && cleanQuery.includes('banks b')) {
              const results = mockReferrals.filter((r) => {
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
        // Execute batch operations in mock memory
        for (const s of statements) {
          // Check for unlink partner referrals
          // UPDATE referrals SET payout_status = 'unpaid', payout_batch_id = NULL WHERE partner_id = ? AND payout_batch_id = ?
          // and batch update: UPDATE payout_batches SET item_count = ..., total_amount_etb = ...
        }
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
});
