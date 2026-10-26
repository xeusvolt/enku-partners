-- Migration 0001: Initial Schema for Enku Partners

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK(role IN ('partner', 'admin')),
    first_name TEXT NOT NULL,
    father_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone_number TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'suspended')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS partner_bank_details (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL UNIQUE,
    bank_id INTEGER NOT NULL,
    account_number TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bank_id) REFERENCES banks(id)
);

CREATE TABLE IF NOT EXISTS partner_commission_rates (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK(role_type IN ('Customer', 'Helper', 'Broker')),
    rate_etb REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (partner_id, role_type)
);

CREATE TABLE IF NOT EXISTS payout_batches (
    id TEXT PRIMARY KEY,
    batch_reference TEXT NOT NULL UNIQUE,
    total_amount_etb REAL NOT NULL DEFAULT 0.0,
    item_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing', 'completed', 'cancelled')),
    created_by_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (created_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    role_type TEXT NOT NULL CHECK(role_type IN ('Customer', 'Helper', 'Broker')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    payout_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payout_status IN ('unpaid', 'processing', 'paid')),
    commission_earned_etb REAL NOT NULL DEFAULT 0.0,
    approved_at TEXT,
    approved_by_id TEXT,
    payout_batch_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by_id) REFERENCES users(id),
    FOREIGN KEY (payout_batch_id) REFERENCES payout_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_referrals_partner ON referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_referrals_phone ON referrals(phone_number);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status, payout_status);
CREATE INDEX IF NOT EXISTS idx_referrals_payout_batch ON referrals(payout_batch_id);
CREATE INDEX IF NOT EXISTS idx_payout_batches_ref ON payout_batches(batch_reference);
