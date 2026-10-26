// Admin Workspace & Payout Engine Routes
import { Hono } from 'hono';
import { requireAdmin } from '../middleware/auth';
import { DbClient } from '../db/client';
import { sendSmsEthiopia } from '../lib/sms';
import {
  AdminLeadsView,
  AdminPartnersView,
  AdminPartnerCommissionsView,
  AdminPayoutsView,
  AdminBatchDetailView
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
  const db = new DbClient(c.env.DB);

  const [batches, unpaidReferrals] = await Promise.all([
    db.getAllPayoutBatches(),
    db.getUnpaidApprovedReferrals()
  ]);

  return c.html(<AdminPayoutsView user={user} batches={batches} unpaidReferrals={unpaidReferrals} message={message} />);
});

adminRoutes.post('/payouts/generate', async (c) => {
  const admin = c.get('user');
  const body = await c.req.parseBody();
  const db = new DbClient(c.env.DB);

  // Handle both single string and array of referral_ids
  let referralIds: string[] = [];
  const rawIds = body['referral_ids'];
  if (Array.isArray(rawIds)) {
    referralIds = rawIds.map(String);
  } else if (rawIds) {
    referralIds = [String(rawIds)];
  } else {
    // If none explicitly selected, fetch all approved unpaid
    const allUnpaid = await db.getUnpaidApprovedReferrals();
    referralIds = allUnpaid.map((r) => r.id);
  }

  if (referralIds.length === 0) {
    return c.redirect('/admin/payouts?msg=No+approved+unpaid+referrals+available+for+batching.');
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

  const [batch, items] = await Promise.all([
    db.getPayoutBatchById(batchId),
    db.getPayoutBatchItems(batchId)
  ]);

  if (!batch) {
    return c.redirect('/admin/payouts?msg=Payout+batch+not+found.');
  }

  return c.html(<AdminBatchDetailView user={user} batch={batch} items={items} message={message} />);
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
 * Outputs banking CSV with required columns:
 * Batch Reference | Partner Name | Phone | Bank Name | Account Holder | Account Number | Amount (ETB)
 */
adminRoutes.get('/payouts/:batchId/export.csv', async (c) => {
  const batchId = c.req.param('batchId');
  const db = new DbClient(c.env.DB);

  const [batch, items] = await Promise.all([
    db.getPayoutBatchById(batchId),
    db.getPayoutBatchItems(batchId)
  ]);

  if (!batch) {
    return c.text('Batch not found', 404);
  }

  const csvRows: string[] = [
    'Batch Reference,Partner Name,Phone,Bank Name,Account Holder,Account Number,Amount (ETB),Role Type,Lead Name'
  ];

  for (const item of items) {
    const clean = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;
    csvRows.push([
      clean(item.batch_reference),
      clean(item.partner_name),
      clean(item.partner_phone),
      clean(item.bank_name),
      clean(item.account_holder),
      clean(item.account_number),
      item.amount_etb,
      clean(item.role_type),
      clean(item.lead_name)
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
