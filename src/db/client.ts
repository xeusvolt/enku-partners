// Cloudflare D1 Database Access Layer for Enku Partners
import type {
  User,
  Bank,
  PartnerBankDetails,
  PartnerCommissionRate,
  Referral,
  PayoutBatch,
  PayoutBatchItem,
  ReferralRoleType,
  UserStatus
} from '../types';

export class DbClient {
  constructor(private db: D1Database) {}

  // ============================================================
  // Users & Authentication
  // ============================================================

  async getUserById(id: string): Promise<User | null> {
    const res = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>();
    return res || null;
  }

  async getUserByPhone(phone: string): Promise<User | null> {
    const res = await this.db
      .prepare('SELECT * FROM users WHERE phone_number = ?')
      .bind(phone)
      .first<User>();
    return res || null;
  }

  async createUser(user: Omit<User, 'created_at'>): Promise<User> {
    const createdAt = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO users (id, role, first_name, father_name, email, phone_number, password_hash, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        user.id,
        user.role,
        user.first_name,
        user.father_name,
        user.email || null,
        user.phone_number,
        user.password_hash,
        user.status,
        createdAt
      )
      .run();

    return { ...user, created_at: createdAt };
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<boolean> {
    const res = await this.db
      .prepare('UPDATE users SET status = ? WHERE id = ?')
      .bind(status, id)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async getAllPartners(status?: UserStatus): Promise<User[]> {
    let query = "SELECT * FROM users WHERE role = 'partner'";
    const params: any[] = [];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';

    const res = await this.db.prepare(query).bind(...params).all<User>();
    return res.results || [];
  }

  // ============================================================
  // Banks & Banking Details
  // ============================================================

  async getBanks(): Promise<Bank[]> {
    const res = await this.db
      .prepare('SELECT * FROM banks WHERE is_active = 1 ORDER BY name ASC')
      .all<Bank>();
    return res.results || [];
  }

  async getPartnerBankDetails(partnerId: string): Promise<PartnerBankDetails | null> {
    const res = await this.db
      .prepare(
        `SELECT pbd.*, b.name as bank_name 
         FROM partner_bank_details pbd
         JOIN banks b ON pbd.bank_id = b.id
         WHERE pbd.partner_id = ?`
      )
      .bind(partnerId)
      .first<PartnerBankDetails>();
    return res || null;
  }

  async upsertPartnerBankDetails(
    partnerId: string,
    bankId: number,
    accountNumber: string,
    accountHolderName: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.getPartnerBankDetails(partnerId);
    if (existing) {
      await this.db
        .prepare(
          `UPDATE partner_bank_details 
           SET bank_id = ?, account_number = ?, account_holder_name = ?, updated_at = ?
           WHERE partner_id = ?`
        )
        .bind(bankId, accountNumber, accountHolderName, now, partnerId)
        .run();
    } else {
      const id = crypto.randomUUID();
      await this.db
        .prepare(
          `INSERT INTO partner_bank_details (id, partner_id, bank_id, account_number, account_holder_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, partnerId, bankId, accountNumber, accountHolderName, now, now)
        .run();
    }
  }

  // ============================================================
  // Commission Rates Matrix
  // ============================================================

  async getPartnerCommissionRates(partnerId: string): Promise<PartnerCommissionRate[]> {
    const res = await this.db
      .prepare('SELECT * FROM partner_commission_rates WHERE partner_id = ? ORDER BY role_type ASC')
      .bind(partnerId)
      .all<PartnerCommissionRate>();
    return res.results || [];
  }

  async getPartnerRateForRole(partnerId: string, roleType: ReferralRoleType): Promise<number> {
    const res = await this.db
      .prepare('SELECT rate_etb FROM partner_commission_rates WHERE partner_id = ? AND role_type = ?')
      .bind(partnerId, roleType)
      .first<{ rate_etb: number }>();
    if (res && res.rate_etb !== undefined) {
      return res.rate_etb;
    }
    // Default fallback commission rates if unconfigured
    switch (roleType) {
      case 'Customer': return 500;
      case 'Helper': return 300;
      case 'Broker': return 1000;
      default: return 0;
    }
  }

  async setPartnerCommissionRate(partnerId: string, roleType: ReferralRoleType, rateEtb: number): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.db
      .prepare('SELECT id FROM partner_commission_rates WHERE partner_id = ? AND role_type = ?')
      .bind(partnerId, roleType)
      .first<{ id: string }>();

    if (existing) {
      await this.db
        .prepare('UPDATE partner_commission_rates SET rate_etb = ?, updated_at = ? WHERE id = ?')
        .bind(rateEtb, now, existing.id)
        .run();
    } else {
      const id = crypto.randomUUID();
      await this.db
        .prepare('INSERT INTO partner_commission_rates (id, partner_id, role_type, rate_etb, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, partnerId, roleType, rateEtb, now, now)
        .run();
    }
  }

  // ============================================================
  // Referrals & Leads
  // ============================================================

  async checkReferralDuplicate(phone: string): Promise<Referral | null> {
    const res = await this.db
      .prepare("SELECT * FROM referrals WHERE phone_number = ? AND status IN ('pending', 'approved')")
      .bind(phone)
      .first<Referral>();
    return res || null;
  }

  async createReferral(referral: {
    id: string;
    partner_id: string;
    full_name: string;
    phone_number: string;
    role_type: ReferralRoleType;
  }): Promise<Referral> {
    const createdAt = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO referrals (id, partner_id, full_name, phone_number, role_type, status, payout_status, commission_earned_etb, created_at)
         VALUES (?, ?, ?, ?, ?, 'pending', 'unpaid', 0.0, ?)`
      )
      .bind(referral.id, referral.partner_id, referral.full_name, referral.phone_number, referral.role_type, createdAt)
      .run();

    return {
      ...referral,
      status: 'pending',
      payout_status: 'unpaid',
      commission_earned_etb: 0.0,
      approved_at: null,
      approved_by_id: null,
      payout_batch_id: null,
      created_at: createdAt
    };
  }

  async getPartnerReferrals(partnerId: string): Promise<Referral[]> {
    const res = await this.db
      .prepare('SELECT * FROM referrals WHERE partner_id = ? ORDER BY created_at DESC')
      .bind(partnerId)
      .all<Referral>();
    return res.results || [];
  }

  async getPartnerStats(partnerId: string): Promise<{
    pendingApprovalsCount: number;
    approvedUnpaidCount: number;
    approvedUnpaidTotalEtb: number;
    paidLifetimeTotalEtb: number;
  }> {
    const pendingRes = await this.db
      .prepare("SELECT COUNT(*) as count FROM referrals WHERE partner_id = ? AND status = 'pending'")
      .bind(partnerId)
      .first<{ count: number }>();

    const approvedUnpaidRes = await this.db
      .prepare(
        "SELECT COUNT(*) as count, COALESCE(SUM(commission_earned_etb), 0) as total FROM referrals WHERE partner_id = ? AND status = 'approved' AND payout_status = 'unpaid'"
      )
      .bind(partnerId)
      .first<{ count: number; total: number }>();

    const paidRes = await this.db
      .prepare(
        "SELECT COALESCE(SUM(commission_earned_etb), 0) as total FROM referrals WHERE partner_id = ? AND payout_status = 'paid'"
      )
      .bind(partnerId)
      .first<{ total: number }>();

    return {
      pendingApprovalsCount: pendingRes?.count || 0,
      approvedUnpaidCount: approvedUnpaidRes?.count || 0,
      approvedUnpaidTotalEtb: approvedUnpaidRes?.total || 0,
      paidLifetimeTotalEtb: paidRes?.total || 0
    };
  }

  async getAllReferrals(filters?: {
    status?: string;
    payout_status?: string;
    partnerId?: string;
  }): Promise<Referral[]> {
    let query = `
      SELECT r.*, u.first_name as partner_first_name, u.father_name as partner_father_name, u.phone_number as partner_phone
      FROM referrals r
      JOIN users u ON r.partner_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND r.status = ?';
      params.push(filters.status);
    }
    if (filters?.payout_status) {
      query += ' AND r.payout_status = ?';
      params.push(filters.payout_status);
    }
    if (filters?.partnerId) {
      query += ' AND r.partner_id = ?';
      params.push(filters.partnerId);
    }

    query += ' ORDER BY r.created_at DESC';

    const res = await this.db.prepare(query).bind(...params).all<Referral>();
    return res.results || [];
  }

  async approveReferral(referralId: string, adminId: string, commissionEtb: number): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await this.db
      .prepare(
        `UPDATE referrals 
         SET status = 'approved', payout_status = 'unpaid', commission_earned_etb = ?, approved_at = ?, approved_by_id = ?
         WHERE id = ? AND status = 'pending'`
      )
      .bind(commissionEtb, now, adminId, referralId)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async rejectReferral(referralId: string): Promise<boolean> {
    const res = await this.db
      .prepare("UPDATE referrals SET status = 'rejected', commission_earned_etb = 0 WHERE id = ? AND status = 'pending'")
      .bind(referralId)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  // ============================================================
  // Payout Batches & Processing
  // ============================================================

  async getUnpaidApprovedReferrals(dateFrom?: string, dateTo?: string): Promise<Referral[]> {
    let query = `
      SELECT r.*, u.first_name as partner_first_name, u.father_name as partner_father_name, u.phone_number as partner_phone
      FROM referrals r
      JOIN users u ON r.partner_id = u.id
      WHERE r.status = 'approved' AND r.payout_status = 'unpaid'
    `;
    const params: any[] = [];
    if (dateFrom) {
      query += ' AND r.created_at >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND r.created_at <= ?';
      params.push(dateTo);
    }
    query += ' ORDER BY r.created_at ASC';

    const res = await this.db.prepare(query).bind(...params).all<Referral>();
    return res.results || [];
  }

  async createPayoutBatch(adminId: string, referralIds: string[]): Promise<PayoutBatch | null> {
    if (referralIds.length === 0) return null;

    // Fetch matching referrals to calculate exact count & total
    const placeholders = referralIds.map(() => '?').join(',');
    const referrals = await this.db
      .prepare(`SELECT * FROM referrals WHERE id IN (${placeholders}) AND status = 'approved' AND payout_status = 'unpaid'`)
      .bind(...referralIds)
      .all<Referral>();

    const validLeads = referrals.results || [];
    if (validLeads.length === 0) return null;

    const validIds = validLeads.map((l) => l.id);
    const validPlaceholders = validIds.map(() => '?').join(',');

    const itemCount = validLeads.length;
    const totalAmountEtb = validLeads.reduce((acc, lead) => acc + (lead.commission_earned_etb || 0), 0);

    const batchId = crypto.randomUUID();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const batchReference = `EP-BATCH-${todayStr}-${randomSuffix}`;
    const createdAt = new Date().toISOString();

    // Prepare atomic statements
    const batchInsertStmt = this.db
      .prepare(
        `INSERT INTO payout_batches (id, batch_reference, total_amount_etb, item_count, status, created_by_id, created_at)
         VALUES (?, ?, ?, ?, 'processing', ?, ?)`
      )
      .bind(batchId, batchReference, totalAmountEtb, itemCount, adminId, createdAt);

    const referralUpdateStmt = this.db
      .prepare(
        `UPDATE referrals 
         SET payout_status = 'processing', payout_batch_id = ?
         WHERE id IN (${validPlaceholders}) AND status = 'approved' AND payout_status = 'unpaid'`
      )
      .bind(batchId, ...validIds);

    // Execute atomically via Cloudflare D1 batch
    await this.db.batch([batchInsertStmt, referralUpdateStmt]);

    return {
      id: batchId,
      batch_reference: batchReference,
      total_amount_etb: totalAmountEtb,
      item_count: itemCount,
      status: 'processing',
      created_by_id: adminId,
      created_at: createdAt,
      completed_at: null
    };
  }

  async getAllPayoutBatches(): Promise<PayoutBatch[]> {
    const res = await this.db
      .prepare('SELECT * FROM payout_batches ORDER BY created_at DESC')
      .all<PayoutBatch>();
    return res.results || [];
  }

  async getPayoutBatchById(batchId: string): Promise<PayoutBatch | null> {
    const res = await this.db
      .prepare('SELECT * FROM payout_batches WHERE id = ?')
      .bind(batchId)
      .first<PayoutBatch>();
    return res || null;
  }

  async getPayoutBatchItems(batchId: string): Promise<PayoutBatchItem[]> {
    const batch = await this.getPayoutBatchById(batchId);
    if (!batch) return [];

    const res = await this.db
      .prepare(
        `SELECT 
          r.id as referral_id,
          ? as batch_reference,
          (u.first_name || ' ' || u.father_name) as partner_name,
          u.phone_number as partner_phone,
          COALESCE(b.name, 'No Bank Configured') as bank_name,
          COALESCE(pbd.account_holder_name, 'N/A') as account_holder,
          COALESCE(pbd.account_number, 'N/A') as account_number,
          r.commission_earned_etb as amount_etb,
          r.role_type,
          r.full_name as lead_name,
          r.phone_number as lead_phone
        FROM referrals r
        JOIN users u ON r.partner_id = u.id
        LEFT JOIN partner_bank_details pbd ON u.id = pbd.partner_id
        LEFT JOIN banks b ON pbd.bank_id = b.id
        WHERE r.payout_batch_id = ?
        ORDER BY partner_name ASC`
      )
      .bind(batch.batch_reference, batchId)
      .all<PayoutBatchItem>();

    return res.results || [];
  }

  /**
   * Single-Item Override:
   * Reject a single bad bank line back to 'unpaid' without voiding the entire batch.
   * Recalculates the batch item_count and total_amount_etb dynamically.
   */
  async rejectPayoutBatchItem(referralId: string, batchId: string): Promise<boolean> {
    const batch = await this.getPayoutBatchById(batchId);
    if (!batch || batch.status !== 'processing') {
      return false;
    }

    const lead = await this.db
      .prepare('SELECT * FROM referrals WHERE id = ? AND payout_batch_id = ?')
      .bind(referralId, batchId)
      .first<Referral>();

    if (!lead) return false;

    // Reset referral to unpaid and unlink from batch
    await this.db
      .prepare("UPDATE referrals SET payout_status = 'unpaid', payout_batch_id = NULL WHERE id = ?")
      .bind(referralId)
      .run();

    // Recalculate batch totals
    const remaining = await this.db
      .prepare(
        'SELECT COUNT(*) as count, COALESCE(SUM(commission_earned_etb), 0) as total FROM referrals WHERE payout_batch_id = ?'
      )
      .bind(batchId)
      .first<{ count: number; total: number }>();

    await this.db
      .prepare('UPDATE payout_batches SET item_count = ?, total_amount_etb = ? WHERE id = ?')
      .bind(remaining?.count || 0, remaining?.total || 0, batchId)
      .run();

    return true;
  }

  /**
   * Complete Batch:
   * Marks batch as 'completed' and all currently associated referrals as 'paid'.
   */
  async completePayoutBatch(batchId: string): Promise<boolean> {
    const batch = await this.getPayoutBatchById(batchId);
    if (!batch || batch.status !== 'processing') {
      return false;
    }

    const now = new Date().toISOString();

    const leadsPaidStmt = this.db
      .prepare("UPDATE referrals SET payout_status = 'paid' WHERE payout_batch_id = ?")
      .bind(batchId);

    const batchCompleteStmt = this.db
      .prepare("UPDATE payout_batches SET status = 'completed', completed_at = ? WHERE id = ?")
      .bind(now, batchId);

    // Execute atomic completion
    await this.db.batch([leadsPaidStmt, batchCompleteStmt]);

    return true;
  }
}
