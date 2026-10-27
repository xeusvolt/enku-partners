// Admin Workspace & Payout Engine Routes
import { Hono } from 'hono';
import { requireAdmin } from '../middleware/auth';
import { DbClient } from '../db/client';
import { sendSmsEthiopia } from '../lib/sms';
import { generateSecureToken } from '../lib/auth';
import {
  AdminLeadsView,
  AdminPartnersView,
  AdminPartnerCommissionsView,
  AdminPayoutsView,
  AdminBatchDetailView,
  AdminBanksView,
  AdminPasswordResetsView
} from '../views/admin_views';
import type { Env, User, ReferralRoleType } from '../types';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Apply admin authentication middleware to all admin routes
adminRoutes.use('*', requireAdmin);

adminRoutes.get('/', (c) => {
  return c.redirect('/admin/leads');
});

// ============================================================
// Referrals & Leads Audit
// ============================================================

adminRoutes.get('/leads', async (c) => {
  const user = c.get('user');
  const statusFilter = c.req.query('status') || '';
  const message = c.req.query('msg');

  const db = new DbClient(c.env.DB);
  const leads = await db.getAllReferrals(statusFilter ? { status: statusFilter } : undefined);

  return c.html(<AdminLeadsView user={user} leads={leads} currentFilter={statusFilter} message={message} />);
});

/**
 * SNAPSHOT INVARIANT:
 * On approve, queries the partner's exact commission rate for this role type
 * and locks it immutably into referrals.commission_earned_etb.
 */
adminRoutes.post('/leads/:id/approve', async (c) => {
  const admin = c.get('user');
  const leadId = c.req.param('id');
  const db = new DbClient(c.env.DB);

  const leads = await db.getAllReferrals();
  const lead = leads.find((l) => l.id === leadId);

  if (!lead) {
    return c.redirect('/admin/leads?msg=Error:+Referral+lead+not+found.');
  }

  if (lead.status !== 'pending') {
    return c.redirect('/admin/leads?msg=Warning:+Lead+is+already+resolved.');
  }

  // Retrieve immutable snapshot rate for (partner_id, role_type)
  const rateEtb = await db.getPartnerRateForRole(lead.partner_id, lead.role_type);

  // Lock rate into referral and transition to approved / unpaid
  await db.approveReferral(leadId, admin.id, rateEtb);

  return c.redirect(`/admin/leads?msg=Lead+approved.+Commission+of+${rateEtb}+ETB+locked+immutably.`);
});

adminRoutes.post('/leads/:id/reject', async (c) => {
  const leadId = c.req.param('id');
  const db = new DbClient(c.env.DB);

  await db.rejectReferral(leadId);
  return c.redirect('/admin/leads?msg=Lead+marked+as+rejected.');
});

// ============================================================
// Partners Management & Commission Calibration
// ============================================================

adminRoutes.get('/partners', async (c) => {
  const user = c.get('user');
  const message = c.req.query('msg');
  const db = new DbClient(c.env.DB);

  const partners = await db.getAllPartners();
  return c.html(<AdminPartnersView user={user} partners={partners} message={message} />);
});

adminRoutes.post('/partners/:id/approve', async (c) => {
  const partnerId = c.req.param('id');
  const db = new DbClient(c.env.DB);

  const partner = await db.getUserById(partnerId);
  if (!partner) {
    return c.redirect('/admin/partners?msg=Error:+Partner+not+found.');
  }

  await db.updateUserStatus(partnerId, 'active');

  // Dispatch SMS notification via SMS Ethiopia API
  const message = `Congratulations ${partner.first_name}! Your Enku Partners account has been approved. You can now login at https://partners.enkumeftihe.com to start referring.`;
  await sendSmsEthiopia(partner.phone_number, message, c.env.SMS_ETHIOPIA_API_KEY);

  return c.redirect(`/admin/partners?msg=Partner+${partner.first_name}+approved+and+SMS+dispatched.`);
});

adminRoutes.post('/partners/:id/reject', async (c) => {
  const partnerId = c.req.param('id');
  const db = new DbClient(c.env.DB);

  await db.updateUserStatus(partnerId, 'suspended');
  return c.redirect('/admin/partners?msg=Partner+application+rejected.');
});

adminRoutes.post('/partners/:id/toggle-status', async (c) => {
  const partnerId = c.req.param('id');
  const db = new DbClient(c.env.DB);

  const partner = await db.getUserById(partnerId);
  if (!partner) return c.redirect('/admin/partners');

  const newStatus = partner.status === 'active' ? 'suspended' : 'active';
  await db.updateUserStatus(partnerId, newStatus);

  return c.redirect(`/admin/partners?msg=Partner+status+updated+to+${newStatus}.`);
});

adminRoutes.get('/partners/:id/commissions', async (c) => {
  const user = c.get('user');
  const partnerId = c.req.param('id');
  const message = c.req.query('msg');
  const db = new DbClient(c.env.DB);

  const partner = await db.getUserById(partnerId);
  if (!partner) return c.redirect('/admin/partners');

  const rates = await db.getPartnerCommissionRates(partnerId);
  return c.html(<AdminPartnerCommissionsView user={user} partner={partner} rates={rates} message={message} />);
});

adminRoutes.post('/partners/:id/commissions', async (c) => {
  const partnerId = c.req.param('id');
  const body = await c.req.parseBody();

  const rateCustomer = parseFloat(String(body.rate_customer || '500'));
  const rateHelper = parseFloat(String(body.rate_helper || '300'));
  const rateBroker = parseFloat(String(body.rate_broker || '1000'));

  const db = new DbClient(c.env.DB);
  await Promise.all([
    db.setPartnerCommissionRate(partnerId, 'Customer', isNaN(rateCustomer) ? 500 : rateCustomer),
    db.setPartnerCommissionRate(partnerId, 'Helper', isNaN(rateHelper) ? 300 : rateHelper),
    db.setPartnerCommissionRate(partnerId, 'Broker', isNaN(rateBroker) ? 1000 : rateBroker)
  ]);

  return c.redirect(`/admin/partners/${partnerId}/commissions?msg=Commission+matrix+updated+successfully.`);
});

// ============================================================
// Batch Payout Lifecycle
// ============================================================

adminRoutes.get('/payouts', async (c) => {
  const user = c.get('user');
  const message = c.req.query('msg');
  const dateFrom = c.req.query('date_from') || '';
  const dateTo = c.req.query('date_to') || '';
  const db = new DbClient(c.env.DB);

  const [batches, unpaidReferrals] = await Promise.all([
    db.getAllPayoutBatches(),
    db.getUnpaidApprovedReferrals(dateFrom || undefined, dateTo || undefined)
  ]);

  return c.html(
    <AdminPayoutsView
      user={user}
      batches={batches}
      unpaidReferrals={unpaidReferrals}
      dateFrom={dateFrom}
      dateTo={dateTo}
      message={message}
    />
  );
});

adminRoutes.post('/payouts/generate', async (c) => {
  const admin = c.get('user');
  const body = await c.req.parseBody();
  const dateFrom = String(body['date_from'] || '').trim();
  const dateTo = String(body['date_to'] || '').trim();
  const db = new DbClient(c.env.DB);

  // Handle both single string and array of referral_ids
  let referralIds: string[] = [];
  const rawIds = body['referral_ids'];
  if (Array.isArray(rawIds)) {
    referralIds = rawIds.map(String);
  } else if (rawIds) {
    referralIds = [String(rawIds)];
  } else {
    // If none explicitly selected, fetch all approved unpaid matching date range
    const unpaidMatching = await db.getUnpaidApprovedReferrals(dateFrom || undefined, dateTo || undefined);
    referralIds = unpaidMatching.map((r) => r.id);
  }

  if (referralIds.length === 0) {
    return c.redirect(`/admin/payouts?date_from=${dateFrom}&date_to=${dateTo}&msg=No+approved+unpaid+referrals+found+in+the+selected+date+range.`);
  }

  const batch = await db.createPayoutBatch(admin.id, referralIds);
  if (!batch) {
    return c.redirect('/admin/payouts?msg=Failed+to+generate+batch.+Please+try+again.');
  }

  return c.redirect(`/admin/payouts/${batch.id}?msg=Payout+batch+${batch.batch_reference}+created+successfully.`);
});

adminRoutes.get('/payouts/:batchId', async (c) => {
  const user = c.get('user');
  const batchId = c.req.param('batchId');
  const message = c.req.query('msg');
  const db = new DbClient(c.env.DB);

  const [batch, groupedItems] = await Promise.all([
    db.getPayoutBatchById(batchId),
    db.getPayoutBatchGroupedItems(batchId)
  ]);

  if (!batch) {
    return c.redirect('/admin/payouts?msg=Payout+batch+not+found.');
  }

  return c.html(<AdminBatchDetailView user={user} batch={batch} groupedItems={groupedItems} message={message} />);
});

/**
 * REJECT PARTNER GROUP:
 * Reject all leads for a partner from an active batch back to 'unpaid'.
 */
adminRoutes.post('/payouts/:batchId/reject-partner/:partnerId', async (c) => {
  const batchId = c.req.param('batchId');
  const partnerId = c.req.param('partnerId');
  const db = new DbClient(c.env.DB);

  await db.rejectPayoutBatchPartnerGroup(partnerId, batchId);

  return c.redirect(`/admin/payouts/${batchId}?msg=Partner+leads+rejected+back+to+unpaid.+Batch+totals+recalculated.`);
});

/**
 * SINGLE-ITEM OVERRIDE:
 * Reject a bad bank line back to 'unpaid' without voiding the entire batch.
 */
adminRoutes.post('/payouts/:batchId/reject-item/:referralId', async (c) => {
  const batchId = c.req.param('batchId');
  const referralId = c.req.param('referralId');
  const db = new DbClient(c.env.DB);

  await db.rejectPayoutBatchItem(referralId, batchId);

  return c.redirect(`/admin/payouts/${batchId}?msg=Line+item+rejected+back+to+unpaid.+Batch+totals+recalculated.`);
});

/**
 * COMPLETE BATCH:
 * Marks batch as 'completed' and all associated leads as 'paid'.
 */
adminRoutes.post('/payouts/:batchId/complete', async (c) => {
  const batchId = c.req.param('batchId');
  const db = new DbClient(c.env.DB);

  await db.completePayoutBatch(batchId);

  return c.redirect(`/admin/payouts/${batchId}?msg=Payout+batch+completed.+All+associated+leads+marked+as+paid.`);
});

/**
 * CSV EXPORT:
 * Outputs banking CSV with aggregated partner rows for bank bulk upload:
 * Batch Reference | Partner Name | Phone | Bank Name | Account Holder | Account Number | Total Leads | Aggregated Total (ETB)
 */
adminRoutes.get('/payouts/:batchId/export.csv', async (c) => {
  const batchId = c.req.param('batchId');
  const db = new DbClient(c.env.DB);

  const [batch, groupedItems] = await Promise.all([
    db.getPayoutBatchById(batchId),
    db.getPayoutBatchGroupedItems(batchId)
  ]);

  if (!batch) {
    return c.text('Batch not found', 404);
  }

  const csvRows: string[] = [
    'Batch Reference,Partner Name,Phone,Bank Name,Account Holder,Account Number,Total Leads,Aggregated Total (ETB)'
  ];

  for (const item of groupedItems) {
    const clean = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    csvRows.push([
      clean(batch.batch_reference),
      clean(item.partner_name),
      clean(item.partner_phone),
      clean(item.bank_name),
      clean(item.account_holder),
      clean(item.account_number),
      item.lead_count,
      item.total_amount_etb
    ].join(','));
  }

  const csvContent = csvRows.join('\r\n');

  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${batch.batch_reference}.csv"`
    }
  });
});

// ============================================================
// Bank Catalog Management
// ============================================================

adminRoutes.get('/banks', async (c) => {
  const user = c.get('user');
  const message = c.req.query('msg');
  const error = c.req.query('err');
  const db = new DbClient(c.env.DB);

  const banks = await db.getAllBanksAdmin();
  return c.html(<AdminBanksView user={user} banks={banks} message={message} error={error} />);
});

adminRoutes.post('/banks', async (c) => {
  const body = await c.req.parseBody();
  const name = String(body.name || '').trim();

  if (!name) {
    return c.redirect('/admin/banks?err=Bank+name+cannot+be+empty.');
  }

  const db = new DbClient(c.env.DB);
  try {
    const success = await db.createBank(name);
    if (!success) {
      return c.redirect('/admin/banks?err=Failed+to+add+bank.');
    }
    return c.redirect('/admin/banks?msg=Bank+added+successfully.');
  } catch (err: any) {
    return c.redirect('/admin/banks?err=Bank+already+exists+or+database+error.');
  }
});

adminRoutes.post('/banks/:id/edit', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.parseBody();
  const name = String(body.name || '').trim();

  if (!id || !name) {
    return c.redirect('/admin/banks?err=Invalid+bank+ID+or+empty+name.');
  }

  const db = new DbClient(c.env.DB);
  try {
    const success = await db.updateBankName(id, name);
    if (!success) {
      return c.redirect('/admin/banks?err=Bank+not+found+or+no+changes+made.');
    }
    return c.redirect('/admin/banks?msg=Bank+name+updated+successfully.');
  } catch (err: any) {
    return c.redirect('/admin/banks?err=Bank+name+already+taken.');
  }
});

adminRoutes.post('/banks/:id/toggle', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!id) {
    return c.redirect('/admin/banks?err=Invalid+bank+ID.');
  }

  const db = new DbClient(c.env.DB);
  await db.toggleBankStatus(id);

  return c.redirect('/admin/banks?msg=Bank+status+toggled+successfully.');
});

// ============================================================
// Password Reset Management
// ============================================================

adminRoutes.get('/resets', async (c) => {
  const user = c.get('user');
  const message = c.req.query('msg');
  const error = c.req.query('err');

  const db = new DbClient(c.env.DB);
  const pendingResets = await db.getPendingPasswordResets();
  const allResets = await db.getAllPasswordResets();
  const recentResets = allResets.filter((r) => r.status !== 'pending');

  return c.html(
    <AdminPasswordResetsView
      user={user}
      pendingResets={pendingResets}
      recentResets={recentResets}
      message={message}
      error={error}
    />
  );
});

adminRoutes.post('/resets/:id/approve', async (c) => {
  const id = c.req.param('id');
  if (!id) {
    return c.redirect('/admin/resets?err=Invalid+reset+ID.');
  }

  const db = new DbClient(c.env.DB);
  const reset = await db.getPasswordResetById(id);

  if (!reset) {
    return c.redirect('/admin/resets?err=Password+reset+request+not+found.');
  }

  if (reset.status !== 'pending') {
    return c.redirect('/admin/resets?err=Request+is+not+in+pending+status.');
  }

  // 1. Generate cryptographically secure random token (32 bytes = 64 hex chars) via Web Crypto
  const token = generateSecureToken(32);

  // 2. Set strict 1-hour expiration timestamp
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  // 3. Update database record with approved status and expiration
  const approved = await db.approvePasswordReset(id, token, expiresAt);
  if (!approved) {
    return c.redirect('/admin/resets?err=Failed+to+approve+password+reset.');
  }

  // 4. Dispatch SMS notification via SMS Ethiopia
  if (reset.user_phone) {
    const smsText = `Reset your Enku Partners password here: https://partners.enkumeftihe.com/reset?token=${token}`;
    await sendSmsEthiopia(reset.user_phone, smsText, c.env.SMS_ETHIOPIA_API_KEY);
  }

  return c.redirect('/admin/resets?msg=Password+reset+request+approved+and+SMS+dispatched+successfully.');
});
