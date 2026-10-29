// Cloudflare D1 Database Access Layer for Enku Partners
import type {
  User,
  Bank,
  PartnerBankDetails,
  PartnerCommissionRate,
  Referral,
  PayoutBatch,
  PayoutBatchItem,
  PayoutBatchGroupedItem,
  PartnerPaymentHistoryItem,
  ReferralRoleType,
  UserStatus,
  PasswordReset
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

  async updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    const res = await this.db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(passwordHash, id)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async promoteUserToAdmin(id: string): Promise<boolean> {
    const res = await this.db
      .prepare("UPDATE users SET role = 'admin', status = 'active' WHERE id = ?")
      .bind(id)
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

  /**
   * Strictly filters active banks (is_active == 1) for Partner Bank Setup.
   */
  async getBanks(): Promise<Bank[]> {
    const res = await this.db
      .prepare('SELECT * FROM banks WHERE is_active = 1 ORDER BY name ASC')
      .all<Bank>();
    return res.results || [];
  }

  /**
   * Returns all banks (active & inactive) for Admin Bank Catalog management.
   */
  async getAllBanksAdmin(): Promise<Bank[]> {
    const res = await this.db
      .prepare('SELECT * FROM banks ORDER BY id ASC')
      .all<Bank>();
    return res.results || [];
  }

  async createBank(name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const res = await this.db
      .prepare('INSERT INTO banks (name, is_active) VALUES (?, 1)')
      .bind(trimmed)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async updateBankName(id: number, name: string): Promise<boolean> {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const res = await this.db
      .prepare('UPDATE banks SET name = ? WHERE id = ?')
      .bind(trimmed, id)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  async toggleBankStatus(id: number): Promise<boolean> {
    const res = await this.db
      .prepare('UPDATE banks SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?')
      .bind(id)
      .run();
    return (res.meta.changes ?? 0) > 0;
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

  /**
   * Active Referrals Only:
   * Returns active leads (pending, or approved unpaid/processing).
   * Completed (paid) referrals are excluded from the main partner dashboard view.
   */
  async getPartnerActiveReferrals(partnerId: string): Promise<Referral[]> {
    const res = await this.db
      .prepare("SELECT * FROM referrals WHERE partner_id = ? AND payout_status != 'paid' ORDER BY created_at DESC")
      .bind(partnerId)
      .all<Referral>();
    return res.results || [];
  }

  /**
   * Payment History Ledger for Partner:
   * Lists completed payout batch disbursements with Date Paid, Number of Leads, and Total ETB Deposited.
   */
  async getPartnerPaymentHistory(partnerId: string): Promise<PartnerPaymentHistoryItem[]> {
    const res = await this.db
      .prepare(
        `SELECT 
          pb.id as batch_id,
          pb.batch_reference,
          COALESCE(pb.completed_at, pb.created_at) as date_paid,
          COUNT(r.id) as lead_count,
          ROUND(SUM(r.commission_earned_etb), 2) as total_etb_deposited
        FROM referrals r
        JOIN payout_batches pb ON r.payout_batch_id = pb.id
        WHERE r.partner_id = ? AND r.payout_status = 'paid' AND pb.status = 'completed'
        GROUP BY pb.id, pb.batch_reference, pb.completed_at, pb.created_at
        ORDER BY date_paid DESC`
      )
      .bind(partnerId)
      .all<PartnerPaymentHistoryItem>();
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
      JOIN partner_bank_details pbd ON u.id = pbd.partner_id
      JOIN banks b ON pbd.bank_id = b.id AND b.is_active = 1
      WHERE r.status = 'approved' AND r.payout_status = 'unpaid'
        AND pbd.account_number IS NOT NULL AND TRIM(pbd.account_number) != ''
    `;
    const params: any[] = [];
    if (dateFrom) {
      query += ' AND date(COALESCE(r.approved_at, r.created_at)) >= date(?)';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND date(COALESCE(r.approved_at, r.created_at)) <= date(?)';
      params.push(dateTo);
    }
    query += ' ORDER BY r.approved_at ASC, r.created_at ASC';

    const res = await this.db.prepare(query).bind(...params).all<Referral>();
    return res.results || [];
  }

  async createPayoutBatch(adminId: string, referralIds: string[]): Promise<PayoutBatch | null> {
    if (!referralIds || referralIds.length === 0) return null;

    // Deduplicate IDs
    const uniqueIds = Array.from(new Set(referralIds.map((id) => id.trim()).filter((id) => id.length > 0)));
    if (uniqueIds.length === 0) return null;

    // Fetch matching referrals requiring active bank configuration
    // Chunking to 250 items per query to prevent SQLite binding variable limit (default 999)
    const chunkSize = 250;
    const validLeads: Referral[] = [];

    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const referrals = await this.db
        .prepare(
          `SELECT r.* 
           FROM referrals r
           JOIN users u ON r.partner_id = u.id
           JOIN partner_bank_details pbd ON u.id = pbd.partner_id
           JOIN banks b ON pbd.bank_id = b.id AND b.is_active = 1
           WHERE r.id IN (${placeholders}) 
             AND r.status = 'approved' 
             AND r.payout_status = 'unpaid'
             AND pbd.account_number IS NOT NULL AND TRIM(pbd.account_number) != ''`
        )
        .bind(...chunk)
        .all<Referral>();

      if (referrals.results) {
        validLeads.push(...referrals.results);
      }
    }

    if (validLeads.length === 0) return null;

    const validIds = validLeads.map((l) => l.id);
    const itemCount = validLeads.length;
    const totalAmountEtb = validLeads.reduce((acc, lead) => acc + (lead.commission_earned_etb || 0), 0);

    const batchId = crypto.randomUUID();
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const batchReference = `EP-BATCH-${todayStr}-${randomSuffix}`;
    const createdAt = new Date().toISOString();

    // Prepare atomic statements: exactly 1 INSERT into payout_batches, followed by chunked UPDATE(s) for referrals
    const batchInsertStmt = this.db
      .prepare(
        `INSERT INTO payout_batches (id, batch_reference, total_amount_etb, item_count, status, created_by_id, created_at)
         VALUES (?, ?, ?, ?, 'processing', ?, ?)`
      )
      .bind(batchId, batchReference, totalAmountEtb, itemCount, adminId, createdAt);

    const atomicStatements: D1PreparedStatement[] = [batchInsertStmt];

    for (let i = 0; i < validIds.length; i += chunkSize) {
      const chunk = validIds.slice(i, i + chunkSize);
      const validPlaceholders = chunk.map(() => '?').join(',');
      atomicStatements.push(
        this.db
          .prepare(
            `UPDATE referrals 
             SET payout_status = 'processing', payout_batch_id = ?
             WHERE id IN (${validPlaceholders}) AND status = 'approved' AND payout_status = 'unpaid'`
          )
          .bind(batchId, ...chunk)
      );
    }

    // Execute atomically via Cloudflare D1 batch (executes within a single transaction)
    await this.db.batch(atomicStatements);

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
   * Aggregated Partner Groupings for Payout Batch:
   * Groups items in a batch by Partner so each partner appears as ONE row on the slip
   * with Partner Name, Phone, Bank Name, Account Number, Total Leads count, and Aggregated Total ETB.
   */
  async getPayoutBatchGroupedItems(batchId: string): Promise<PayoutBatchGroupedItem[]> {
    const res = await this.db
      .prepare(
        `SELECT 
          u.id as partner_id,
          (u.first_name || ' ' || u.father_name) as partner_name,
          u.phone_number as partner_phone,
          COALESCE(b.name, 'No Bank Configured') as bank_name,
          COALESCE(pbd.account_holder_name, 'N/A') as account_holder,
          COALESCE(pbd.account_number, 'N/A') as account_number,
          COUNT(r.id) as lead_count,
          ROUND(SUM(r.commission_earned_etb), 2) as total_amount_etb,
          GROUP_CONCAT(r.id) as referral_ids_str
        FROM referrals r
        JOIN users u ON r.partner_id = u.id
        LEFT JOIN partner_bank_details pbd ON u.id = pbd.partner_id
        LEFT JOIN banks b ON pbd.bank_id = b.id
        WHERE r.payout_batch_id = ?
        GROUP BY u.id, u.first_name, u.father_name, u.phone_number, b.name, pbd.account_holder_name, pbd.account_number
        ORDER BY partner_name ASC`
      )
      .bind(batchId)
      .all<{
        partner_id: string;
        partner_name: string;
        partner_phone: string;
        bank_name: string;
        account_holder: string;
        account_number: string;
        lead_count: number;
        total_amount_etb: number;
        referral_ids_str: string;
      }>();

    const rows = res.results || [];
    return rows.map((row) => ({
      partner_id: row.partner_id,
      partner_name: row.partner_name,
      partner_phone: row.partner_phone,
      bank_name: row.bank_name,
      account_holder: row.account_holder,
      account_number: row.account_number,
      lead_count: row.lead_count,
      total_amount_etb: row.total_amount_etb,
      referral_ids: row.referral_ids_str ? row.referral_ids_str.split(',') : []
    }));
  }

  /**
   * Reject Partner Group:
   * Reject all leads belonging to a specific partner in an active batch back to 'unpaid'.
   * Decrements item_count by the partner's lead_count, subtracts the group total from
   * total_amount_etb, and auto-cancels the batch if item_count drops to 0.
   */
  async rejectPayoutBatchPartnerGroup(partnerId: string, batchId: string): Promise<boolean> {
    const batch = await this.getPayoutBatchById(batchId);
    if (!batch || batch.status !== 'processing') {
      return false;
    }

    const leadsRes = await this.db
      .prepare(
        `SELECT id, commission_earned_etb 
         FROM referrals 
         WHERE partner_id = ? AND payout_batch_id = ? AND payout_status = 'processing'`
      )
      .bind(partnerId, batchId)
      .all<{ id: string; commission_earned_etb: number }>();

    const leads = leadsRes.results || [];
    if (leads.length === 0) return false;

    const leadCount = leads.length;
    const groupTotalEtb = leads.reduce((sum, l) => sum + (l.commission_earned_etb || 0), 0);

    // 1. Unlink all partner leads and revert to unpaid
    const unlinkStmt = this.db
      .prepare(
        `UPDATE referrals 
         SET payout_status = 'unpaid', payout_batch_id = NULL 
         WHERE partner_id = ? AND payout_batch_id = ? AND payout_status = 'processing'`
      )
      .bind(partnerId, batchId);

    // 2. Perform atomic arithmetic & state transition directly inside SQL
    const updateBatchStmt = this.db
      .prepare(
        `UPDATE payout_batches 
         SET item_count = MAX(0, item_count - ?),
             total_amount_etb = MAX(0, ROUND(total_amount_etb - ?, 2)),
             status = CASE WHEN item_count - ? <= 0 THEN 'cancelled' ELSE status END
         WHERE id = ? AND status = 'processing'`
      )
      .bind(leadCount, groupTotalEtb, leadCount, batchId);

    // Execute atomically via Cloudflare D1 batch
    const results = await this.db.batch([unlinkStmt, updateBatchStmt]);
    return (results[0]?.meta?.changes ?? 0) > 0;
  }

  /**
   * Single-Item Override:
   * Reject a single bad bank line back to 'unpaid' without voiding the entire batch.
   * Decrements item_count, subtracts line amount from total_amount_etb, and if
   * the batch becomes empty (item_count reaches 0), automatically cancels the batch.
   */
  async rejectPayoutBatchItem(referralId: string, batchId: string): Promise<boolean> {
    const batch = await this.getPayoutBatchById(batchId);
    if (!batch || batch.status !== 'processing') {
      return false;
    }

    const lead = await this.db
      .prepare('SELECT * FROM referrals WHERE id = ? AND payout_batch_id = ? AND payout_status = "processing"')
      .bind(referralId, batchId)
      .first<Referral>();

    if (!lead) return false;

    const leadAmount = lead.commission_earned_etb || 0;

    // 1. Unlink referral and revert to unpaid only if currently attached to this batch
    const unlinkStmt = this.db
      .prepare(
        "UPDATE referrals SET payout_status = 'unpaid', payout_batch_id = NULL WHERE id = ? AND payout_batch_id = ? AND payout_status = 'processing'"
      )
      .bind(referralId, batchId);

    // 2. Perform atomic arithmetic & state transition directly inside SQL to prevent lost updates
    const updateBatchStmt = this.db
      .prepare(
        `UPDATE payout_batches 
         SET item_count = MAX(0, item_count - 1),
             total_amount_etb = MAX(0, ROUND(total_amount_etb - ?, 2)),
             status = CASE WHEN item_count - 1 <= 0 THEN 'cancelled' ELSE status END
         WHERE id = ? AND status = 'processing'`
      )
      .bind(leadAmount, batchId);

    // Execute atomically via Cloudflare D1 batch
    const results = await this.db.batch([unlinkStmt, updateBatchStmt]);
    return (results[0]?.meta?.changes ?? 0) > 0;
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
      .prepare("UPDATE referrals SET payout_status = 'paid' WHERE payout_batch_id = ? AND payout_status = 'processing'")
      .bind(batchId);

    const batchCompleteStmt = this.db
      .prepare("UPDATE payout_batches SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'processing' AND item_count > 0")
      .bind(now, batchId);

    // Execute atomic completion
    await this.db.batch([leadsPaidStmt, batchCompleteStmt]);

    return true;
  }

  // ============================================================
  // Password Resets Lifecycle
  // ============================================================

  async createPasswordResetRequest(userId: string): Promise<PasswordReset> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        "INSERT INTO password_resets (id, user_id, reset_token, status, expires_at, created_at) VALUES (?, ?, NULL, 'pending', NULL, ?)"
      )
      .bind(id, userId, now)
      .run();

    return {
      id,
      user_id: userId,
      reset_token: null,
      status: 'pending',
      expires_at: null,
      created_at: now
    };
  }

  async getPendingPasswordResets(): Promise<PasswordReset[]> {
    const res = await this.db
      .prepare(
        `SELECT pr.*, u.first_name as user_first_name, u.father_name as user_father_name, u.phone_number as user_phone
         FROM password_resets pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.status = 'pending'
         ORDER BY pr.created_at DESC`
      )
      .all<PasswordReset>();

    return res.results || [];
  }

  async getAllPasswordResets(): Promise<PasswordReset[]> {
    const res = await this.db
      .prepare(
        `SELECT pr.*, u.first_name as user_first_name, u.father_name as user_father_name, u.phone_number as user_phone
         FROM password_resets pr
         JOIN users u ON pr.user_id = u.id
         ORDER BY pr.created_at DESC
         LIMIT 50`
      )
      .all<PasswordReset>();

    return res.results || [];
  }

  async getPasswordResetById(id: string): Promise<PasswordReset | null> {
    const res = await this.db
      .prepare(
        `SELECT pr.*, u.first_name as user_first_name, u.father_name as user_father_name, u.phone_number as user_phone
         FROM password_resets pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.id = ?`
      )
      .bind(id)
      .first<PasswordReset>();

    return res || null;
  }

  async approvePasswordReset(id: string, token: string, expiresAt: string): Promise<boolean> {
    const res = await this.db
      .prepare(
        "UPDATE password_resets SET reset_token = ?, status = 'approved', expires_at = ? WHERE id = ? AND status = 'pending'"
      )
      .bind(token, expiresAt, id)
      .run();

    return (res.meta.changes ?? 0) > 0;
  }

  async getPasswordResetByToken(token: string): Promise<PasswordReset | null> {
    const res = await this.db
      .prepare(
        `SELECT pr.*, u.first_name as user_first_name, u.father_name as user_father_name, u.phone_number as user_phone
         FROM password_resets pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.reset_token = ?`
      )
      .bind(token)
      .first<PasswordReset>();

    return res || null;
  }

  async completePasswordReset(resetId: string, userId: string, newPasswordHash: string): Promise<boolean> {
    const updateResetStmt = this.db
      .prepare("UPDATE password_resets SET status = 'used' WHERE id = ? AND status = 'approved'")
      .bind(resetId);

    const updateUserStmt = this.db
      .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(newPasswordHash, userId);

    const results = await this.db.batch([updateResetStmt, updateUserStmt]);
    return results.every((r) => r.success);
  }
}
