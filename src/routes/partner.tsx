// Partner Routes for Enku Partners
import { Hono } from 'hono';
import { requirePartner } from '../middleware/auth';
import { DbClient } from '../db/client';
import { normalizeEthiopianPhone } from '../lib/phone';
import {
  PartnerDashboardView,
  AddLeadView,
  EarningsView,
  ProfileView
} from '../views/partner_views';
import type { Env, User, ReferralRoleType } from '../types';

export const partnerRoutes = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Apply partner authentication middleware to all partner routes
partnerRoutes.use('*', requirePartner);

partnerRoutes.get('/', async (c) => {
  const user = c.get('user');
  const db = new DbClient(c.env.DB);

  const [stats, bankDetails, activeReferrals] = await Promise.all([
    db.getPartnerStats(user.id),
    db.getPartnerBankDetails(user.id),
    db.getPartnerActiveReferrals(user.id)
  ]);

  const message = c.req.query('msg');

  return c.html(
    <PartnerDashboardView
      user={user}
      stats={stats}
      hasBankDetails={bankDetails !== null}
      recentReferrals={activeReferrals.slice(0, 10)}
      message={message}
    />
  );
});

partnerRoutes.get('/leads/new', (c) => {
  const user = c.get('user');
  return c.html(<AddLeadView user={user} />);
});

partnerRoutes.post('/leads/new', async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();

  const fullName = String(body.full_name || '').trim();
  const rawPhone = String(body.phone_number || '').trim();
  const roleType = String(body.role_type || '') as ReferralRoleType;

  const formData = { full_name: fullName, phone_number: rawPhone, role_type: roleType };

  if (!fullName) {
    return c.html(<AddLeadView user={user} error="Lead full name is required." formData={formData} />, 400);
  }

  // Strict XSS Prevention: Reject script tags, HTML tags, or javascript schemes
  if (/<[^>]*>|javascript:|alert\(|onerror=/i.test(fullName)) {
    return c.html(<AddLeadView user={user} error="Invalid characters or script tags detected in lead name." formData={formData} />, 400);
  }

  if (!['Customer', 'Helper', 'Broker'].includes(roleType)) {
    return c.html(<AddLeadView user={user} error="Invalid target role type selected." formData={formData} />, 400);
  }

  // Strict Ethiopian phone validation & normalization
  const normalizedPhone = normalizeEthiopianPhone(rawPhone);
  if (!normalizedPhone) {
    return c.html(
      <AddLeadView
        user={user}
        error="Invalid Ethiopian phone number. Must be 10 digits starting with 09 or 07 (or international +251...)."
        formData={formData}
      />,
      400
    );
  }

  // Anti-Fraud Rule 1: Block Self-Referrals
  if (normalizedPhone === user.phone_number) {
    return c.html(
      <AddLeadView
        user={user}
        error="Self-referral violation: You cannot submit your own phone number as a referral lead."
        formData={formData}
      />,
      400
    );
  }

  const db = new DbClient(c.env.DB);

  // Anti-Fraud Rule 2: Block Duplicate Pending or Approved Referrals Across Network
  const existingDuplicate = await db.checkReferralDuplicate(normalizedPhone);
  if (existingDuplicate) {
    return c.html(
      <AddLeadView
        user={user}
        error="Duplicate Lead Alert: This phone number is already registered in active review or approved in our platform."
        formData={formData}
      />,
      409
    );
  }

  // Create lead in pending state
  const referralId = crypto.randomUUID();
  await db.createReferral({
    id: referralId,
    partner_id: user.id,
    full_name: fullName,
    phone_number: normalizedPhone,
    role_type: roleType
  });

  return c.redirect('/partner?msg=Referral+lead+submitted+successfully.+Our+team+will+verify+it+shortly.');
});

partnerRoutes.get('/earnings', async (c) => {
  const user = c.get('user');
  const db = new DbClient(c.env.DB);

  const [stats, referrals, paymentHistory] = await Promise.all([
    db.getPartnerStats(user.id),
    db.getPartnerReferrals(user.id),
    db.getPartnerPaymentHistory(user.id)
  ]);

  return c.html(<EarningsView user={user} stats={stats} referrals={referrals} paymentHistory={paymentHistory} />);
});

partnerRoutes.get('/profile', async (c) => {
  const user = c.get('user');
  const db = new DbClient(c.env.DB);

  const [banks, bankDetails] = await Promise.all([
    db.getBanks(),
    db.getPartnerBankDetails(user.id)
  ]);

  const message = c.req.query('msg');
  const error = c.req.query('err');

  return c.html(
    <ProfileView
      user={user}
      banks={banks}
      bankDetails={bankDetails}
      message={message}
      error={error}
    />
  );
});

partnerRoutes.post('/profile/bank', async (c) => {
  const user = c.get('user');
  const body = await c.req.parseBody();

  const bankId = parseInt(String(body.bank_id || '0'), 10);
  const accountHolderName = String(body.account_holder_name || '').trim();
  const accountNumber = String(body.account_number || '').trim();

  if (!bankId || !accountHolderName || !accountNumber) {
    return c.redirect('/partner/profile?err=All+bank+fields+are+required.');
  }

  const db = new DbClient(c.env.DB);
  const activeBanks = await db.getBanks();
  const isBankValidAndActive = activeBanks.some((b) => b.id === bankId);

  if (!isBankValidAndActive) {
    return c.redirect('/partner/profile?err=Selected+bank+is+invalid+or+currently+disabled.');
  }

  await db.upsertPartnerBankDetails(user.id, bankId, accountNumber, accountHolderName);

  return c.redirect('/partner/profile?msg=Bank+details+saved+successfully.');
});
