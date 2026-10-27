// Enku Partners Domain & Database Types

export type UserRole = 'partner' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ReferralRoleType = 'Customer' | 'Helper' | 'Broker';
export type ReferralStatus = 'pending' | 'approved' | 'rejected';
export type PayoutStatus = 'unpaid' | 'processing' | 'paid';
export type BatchStatus = 'processing' | 'completed' | 'cancelled';
export type PasswordResetStatus = 'pending' | 'approved' | 'used';

export interface User {
  id: string;
  role: UserRole;
  first_name: string;
  father_name: string;
  email: string | null;
  phone_number: string;
  password_hash: string;
  status: UserStatus;
  created_at: string;
}

export interface Bank {
  id: number;
  name: string;
  is_active: number;
}

export interface PartnerBankDetails {
  id: string;
  partner_id: string;
  bank_id: number;
  account_number: string;
  account_holder_name: string;
  created_at: string;
  updated_at: string;
  bank_name?: string;
}

export interface PartnerCommissionRate {
  id: string;
  partner_id: string;
  role_type: ReferralRoleType;
  rate_etb: number;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  partner_id: string;
  full_name: string;
  phone_number: string;
  role_type: ReferralRoleType;
  status: ReferralStatus;
  payout_status: PayoutStatus;
  commission_earned_etb: number;
  approved_at: string | null;
  approved_by_id: string | null;
  payout_batch_id: string | null;
  created_at: string;
  partner_first_name?: string;
  partner_father_name?: string;
  partner_phone?: string;
}

export interface PayoutBatch {
  id: string;
  batch_reference: string;
  total_amount_etb: number;
  item_count: number;
  status: BatchStatus;
  created_by_id: string;
  created_at: string;
  completed_at: string | null;
}

export interface PayoutBatchItem {
  referral_id: string;
  batch_reference: string;
  partner_name: string;
  partner_phone: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  amount_etb: number;
  role_type: ReferralRoleType;
  lead_name: string;
  lead_phone: string;
}

export interface PayoutBatchGroupedItem {
  partner_id: string;
  partner_name: string;
  partner_phone: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  lead_count: number;
  total_amount_etb: number;
  referral_ids: string[];
}

export interface PartnerPaymentHistoryItem {
  batch_id: string;
  batch_reference: string;
  date_paid: string;
  lead_count: number;
  total_etb_deposited: number;
}

export interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
  SMS_ETHIOPIA_API_KEY?: string;
  ENVIRONMENT?: string;
  BASE_URL?: string;
  ADMIN_PHONE?: string;
  ADMIN_PASSWORD?: string;
}

export interface SessionData {
  userId: string;
  role: UserRole;
  phone: string;
  firstName: string;
  status: UserStatus;
  exp: number;
}

export interface PasswordReset {
  id: string;
  user_id: string;
  reset_token: string | null;
  status: PasswordResetStatus;
  expires_at: string | null;
  created_at: string;
  user_first_name?: string;
  user_father_name?: string;
  user_phone?: string;
}
