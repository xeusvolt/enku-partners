// Mobile-Centric Partner Experience Views — Monochrome Design
import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';
import type { User, Referral, Bank, PartnerBankDetails, PartnerPaymentHistoryItem } from '../types';
import { formatEthiopianPhoneDisplay } from '../lib/phone';

interface PartnerDashboardProps {
  user: User;
  stats: {
    pendingApprovalsCount: number;
    approvedUnpaidCount: number;
    approvedUnpaidTotalEtb: number;
    paidLifetimeTotalEtb: number;
  };
  hasBankDetails: boolean;
  recentReferrals: Referral[];
  message?: string;
}

export const PartnerDashboardView: FC<PartnerDashboardProps> = ({
  user,
  stats,
  hasBankDetails,
  recentReferrals,
  message
}) => {
  // Defensive filter: Only active leads (status: pending or unpaid/processing) are displayed
  const activeReferrals = recentReferrals.filter((r) => r.payout_status !== 'paid');

  return (
    <BaseLayout title="Partner Dashboard" activeNav="dashboard" isPartner userFirstName={user.first_name}>
      <div class="space-y-4 pt-3">
        {/* Success / Alert Banner */}
        {message && (
          <div class="p-3.5 bg-[#161616] border border-white/20 rounded-xl text-xs text-white flex items-center justify-between">
            <span>{message}</span>
          </div>
        )}

        {/* Streamlined Missing Bank Nudge Banner */}
        {stats.approvedUnpaidCount > 0 && !hasBankDetails && (
          <a
            href="/partner/profile"
            class="block p-3.5 sm:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl hover:bg-yellow-500/15 transition-all active:scale-[0.99] group shadow-sm"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <svg class="w-6 h-6" fill="none" stroke="#EAB308" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p class="text-xs text-yellow-200/90 font-medium">
                  You have approved commissions! Please add your payout details to receive your money.
                </p>
              </div>
              <span class="inline-flex items-center justify-center px-4 py-1.5 text-xs font-bold text-black bg-white rounded-full shrink-0 uppercase tracking-wider group-hover:bg-[#EAEAEA] transition-colors self-end sm:self-auto">
                Add Bank →
              </span>
            </div>
          </a>
        )}

        {/* First-Login Prompt: Bank Setup Reminder (only shown if no approved commissions pending) */}
        {stats.approvedUnpaidCount === 0 && !hasBankDetails && (
          <a
            href="/partner/profile"
            class="block p-4 bg-[#121212] border border-white/30 rounded-2xl hover:border-white transition-all active:scale-[0.99] group shadow-lg"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-xs shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-xs font-semibold text-white group-hover:underline">Setup Your Bank Account</h3>
                  <p class="text-[11px] text-[#888888]">Link your payout account (CBE, Awash, Telebirr) to receive earnings.</p>
                </div>
              </div>
              <span class="text-white text-sm">→</span>
            </div>
          </a>
        )}

        {/* Top Executive Stats Card */}
        <div class="grid grid-cols-2 gap-3">
          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl">
            <span class="text-[10px] font-medium uppercase tracking-wider text-[#888888]">Approved Unpaid</span>
            <div class="mt-1 flex items-baseline space-x-1.5">
              <span class="text-xl font-bold text-white tracking-tight">
                {stats.approvedUnpaidTotalEtb.toLocaleString()}
              </span>
              <span class="text-[10px] text-[#888888] font-mono">ETB</span>
            </div>
            <span class="text-[10px] text-[#666666] mt-0.5 block">{stats.approvedUnpaidCount} leads ready</span>
          </div>

          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl">
            <span class="text-[10px] font-medium uppercase tracking-wider text-[#888888]">Lifetime Paid</span>
            <div class="mt-1 flex items-baseline space-x-1.5">
              <span class="text-xl font-bold text-white tracking-tight">
                {stats.paidLifetimeTotalEtb.toLocaleString()}
              </span>
              <span class="text-[10px] text-[#888888] font-mono">ETB</span>
            </div>
            <span class="text-[10px] text-[#666666] mt-0.5 block">Total disbursed</span>
          </div>
        </div>

        {/* Pending Card */}
        <div class="p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-2xl flex items-center justify-between">
          <div class="flex items-center space-x-2.5">
            <div class="w-2 h-2 rounded-full bg-white/70 animate-pulse"></div>
            <div>
              <span class="text-[11px] font-medium text-white">Pending Verification</span>
              <span class="text-[10px] text-[#888888] block">Awaiting admin review</span>
            </div>
          </div>
          <span class="text-sm font-bold text-white px-2.5 py-0.5 rounded-full bg-[#161616] border border-[#333333]">
            {stats.pendingApprovalsCount}
          </span>
        </div>

        {/* Quick Lead Submission CTA */}
        <a
          href="/partner/leads/new"
          class="block w-full py-3.5 px-6 bg-white text-black text-center font-bold text-xs uppercase tracking-wider rounded-full active:scale-[0.98] transition-transform shadow-md"
        >
          + Submit New Referral Lead
        </a>

        {/* Active Referrals List (Paid leads are hidden) */}
        <div class="pt-2">
          <div class="flex items-center justify-between mb-2.5">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-[#888888]">Active Referrals ({activeReferrals.length})</h2>
            <a href="/partner/earnings" class="text-[11px] text-white hover:underline">View All / History</a>
          </div>

          {activeReferrals.length === 0 ? (
            <div class="p-8 text-center bg-[#0A0A0A] border border-[#262626] rounded-2xl">
              <p class="text-xs text-[#888888]">No active leads in queue.</p>
              <p class="text-[11px] text-[#555555] mt-1">Start by adding your first client, helper, or broker lead, or view completed payments in the earnings tab.</p>
            </div>
          ) : (
            <div class="space-y-2.5">
              {activeReferrals.map((r) => (
                <div key={r.id} class="p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-2xl flex items-center justify-between">
                  <div class="space-y-0.5">
                    <div class="flex items-center space-x-2">
                      <span class="text-xs font-semibold text-white">{r.full_name}</span>
                      <span class="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#333333] text-[#888888]">
                        {r.role_type}
                      </span>
                    </div>
                    <p class="text-[11px] text-[#888888] font-mono">{formatEthiopianPhoneDisplay(r.phone_number)}</p>
                    <p class="text-[10px] text-[#555555]">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <div class="text-right space-y-1">
                    {r.status === 'pending' && (
                      <span class="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#333333] text-[#888888]">
                        Pending
                      </span>
                    )}
                    {r.status === 'rejected' && (
                      <span class="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1C1C1C] text-[#666666]">
                        Rejected
                      </span>
                    )}
                    {r.status === 'approved' && (
                      <div>
                        <span class="text-xs font-bold text-white block">
                          +{r.commission_earned_etb} <span class="text-[9px] font-normal text-[#888888]">ETB</span>
                        </span>
                        <span class="inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white text-white">
                          {r.payout_status === 'processing' ? 'Processing' : 'Unpaid'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};

interface AddLeadViewProps {
  user: User;
  error?: string;
  formData?: {
    full_name?: string;
    phone_number?: string;
    role_type?: string;
  };
}

export const AddLeadView: FC<AddLeadViewProps> = ({ user, error, formData = {} }) => {
  return (
    <BaseLayout title="Submit Lead" activeNav="add-lead" isPartner userFirstName={user.first_name}>
      <div class="space-y-4 pt-3">
        <div>
          <h1 class="text-base font-bold uppercase tracking-wider text-white">Add Referral Lead</h1>
          <p class="text-xs text-[#888888] mt-0.5">Submit customer or worker contacts to earn commission</p>
        </div>

        {error && (
          <div class="p-3.5 rounded-xl bg-[#161616] border border-[#333333] text-xs text-white flex items-center space-x-2">
            <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form action="/partner/leads/new" method="post" class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-5 space-y-4 shadow-xl">
          <div>
            <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
              Target Role Type
            </label>
            <select
              name="role_type"
              required
              class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-white transition-colors"
            >
              <option value="Customer" selected={formData.role_type === 'Customer'}>Customer (Hiring or seeking services)</option>
              <option value="Helper" selected={formData.role_type === 'Helper'}>Helper (Domestic worker / Cook / Nanny)</option>
              <option value="Broker" selected={formData.role_type === 'Broker'}>Broker (Agent / Sub-network)</option>
            </select>
          </div>

          <div>
            <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
              Lead's Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name || ''}
              required
              placeholder="e.g. Almaz Tadesse"
              class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number || ''}
              required
              placeholder="0911223344"
              class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
            />
            <span class="text-[10px] text-[#666666] mt-1 block">Valid format: 09... or 07... (or +251...)</span>
          </div>

          <div class="p-3 bg-[#121212] border border-[#222222] rounded-xl text-[11px] text-[#888888] space-y-1">
            <span class="font-semibold text-white block">Integrity & Anti-Fraud Guarantee:</span>
            <p>Self-referrals and duplicate pending leads across the network are blocked. Once approved by management, your rate is locked for disbursement.</p>
          </div>

          <button
            type="submit"
            class="w-full py-3.5 px-6 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full active:scale-[0.98] transition-transform shadow-md"
          >
            Submit Referral
          </button>
        </form>
      </div>
    </BaseLayout>
  );
};

interface EarningsViewProps {
  user: User;
  stats: {
    pendingApprovalsCount: number;
    approvedUnpaidCount: number;
    approvedUnpaidTotalEtb: number;
    paidLifetimeTotalEtb: number;
  };
  referrals: Referral[];
  paymentHistory: PartnerPaymentHistoryItem[];
}

export const EarningsView: FC<EarningsViewProps> = ({ user, stats, referrals, paymentHistory = [] }) => {
  return (
    <BaseLayout title="Earnings & Referrals" activeNav="earnings" isPartner userFirstName={user.first_name}>
      <div class="space-y-6 pt-3">
        <div>
          <h1 class="text-base font-bold uppercase tracking-wider text-white">Earnings & Payment Ledger</h1>
          <p class="text-xs text-[#888888] mt-0.5">Track your verified commissions, payout history, and referral pipeline</p>
        </div>

        {/* Summary Card */}
        <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl space-y-3">
          <div class="flex justify-between items-center pb-3 border-b border-[#1E1E1E]">
            <span class="text-xs text-[#888888]">Lifetime Paid Earnings</span>
            <span class="text-sm font-bold text-white font-mono">{stats.paidLifetimeTotalEtb.toLocaleString()} ETB</span>
          </div>
          <div class="flex justify-between items-center pb-3 border-b border-[#1E1E1E]">
            <span class="text-xs text-[#888888]">Approved Awaiting Payout</span>
            <span class="text-sm font-bold text-white font-mono">{stats.approvedUnpaidTotalEtb.toLocaleString()} ETB</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-xs text-[#888888]">Total Leads In Queue</span>
            <span class="text-xs font-semibold text-white">{referrals.length} leads</span>
          </div>
        </div>

        {/* Payment History Tab / Ledger Section */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xs font-bold uppercase tracking-wider text-white">Payment History Ledger</h2>
              <p class="text-[11px] text-[#888888] mt-0.5">Disbursed bank transfers from completed payout batches</p>
            </div>
            <span class="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#333333] text-[#888888]">
              {paymentHistory.length} {paymentHistory.length === 1 ? 'Payout' : 'Payouts'}
            </span>
          </div>

          <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                  <th class="py-3 px-4">Date Paid</th>
                  <th class="py-3 px-4">Number of Leads</th>
                  <th class="py-3 px-4 text-right">Total ETB Deposited</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1A1A1A]">
                {paymentHistory.length === 0 ? (
                  <tr>
                    <td colspan={3} class="py-8 text-center text-[#666666]">
                      <p class="text-xs">No completed payouts recorded yet.</p>
                      <p class="text-[11px] text-[#444444] mt-1">Once management completes a payout batch, your deposit history will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  paymentHistory.map((item) => (
                    <tr key={item.batch_id} class="hover:bg-[#121212]/50 transition-colors">
                      <td class="py-3.5 px-4">
                        <span class="font-mono text-white text-xs block">
                          {new Date(item.date_paid).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span class="text-[10px] text-[#666666] font-mono">{item.batch_reference}</span>
                      </td>
                      <td class="py-3.5 px-4 font-mono text-white">
                        {item.lead_count} {item.lead_count === 1 ? 'lead' : 'leads'}
                      </td>
                      <td class="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                        {item.total_etb_deposited.toLocaleString()} ETB
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Referrals Breakdown Section */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-white">Referral Submissions Pipeline ({referrals.length})</h2>
            <span class="text-[10px] text-[#888888]">Detailed lead status</span>
          </div>

          <div class="space-y-2.5">
            {referrals.map((r) => (
              <div key={r.id} class="p-3.5 bg-[#0A0A0A] border border-[#262626] rounded-2xl flex items-center justify-between">
                <div class="space-y-0.5">
                  <div class="flex items-center space-x-2">
                    <span class="text-xs font-semibold text-white">{r.full_name}</span>
                    <span class="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#333333] text-[#888888]">
                      {r.role_type}
                    </span>
                  </div>
                  <p class="text-[11px] text-[#888888] font-mono">{formatEthiopianPhoneDisplay(r.phone_number)}</p>
                  <p class="text-[10px] text-[#555555]">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div class="text-right space-y-1">
                  {r.status === 'pending' && (
                    <span class="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#333333] text-[#888888]">
                      Pending
                    </span>
                  )}
                  {r.status === 'rejected' && (
                    <span class="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1C1C1C] text-[#666666]">
                      Rejected
                    </span>
                  )}
                  {r.status === 'approved' && (
                    <div>
                      <span class="text-xs font-bold text-white block">
                        +{r.commission_earned_etb} <span class="text-[9px] font-normal text-[#888888]">ETB</span>
                      </span>
                      {r.payout_status === 'paid' ? (
                        <span class="inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-black font-semibold">
                          Paid
                        </span>
                      ) : (
                        <span class="inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white text-white">
                          {r.payout_status === 'processing' ? 'Processing' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

interface ProfileViewProps {
  user: User;
  banks: Bank[];
  bankDetails: PartnerBankDetails | null;
  message?: string;
  error?: string;
}

export const ProfileView: FC<ProfileViewProps> = ({ user, banks, bankDetails, message, error }) => {
  return (
    <BaseLayout title="Bank & Profile" activeNav="profile" isPartner userFirstName={user.first_name}>
      <div class="space-y-4 pt-3">
        <div>
          <h1 class="text-base font-bold uppercase tracking-wider text-white">Bank & Account Profile</h1>
          <p class="text-xs text-[#888888] mt-0.5">Manage your payout account and partner details</p>
        </div>

        {message && (
          <div class="p-3.5 bg-[#161616] border border-white/20 rounded-xl text-xs text-white">
            {message}
          </div>
        )}

        {error && (
          <div class="p-3.5 bg-[#161616] border border-red-500/40 rounded-xl text-xs text-white">
            {error}
          </div>
        )}

        {/* Partner Identity Card */}
        <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl space-y-2">
          <div class="flex justify-between items-center text-xs">
            <span class="text-[#888888]">Partner Name</span>
            <span class="font-semibold text-white">{user.first_name} {user.father_name}</span>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-[#888888]">Registered Phone</span>
            <span class="font-mono text-white">{formatEthiopianPhoneDisplay(user.phone_number)}</span>
          </div>
          <div class="flex justify-between items-center text-xs">
            <span class="text-[#888888]">Status</span>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-white text-black font-semibold">
              {user.status}
            </span>
          </div>
        </div>

        {/* Bank Account Form */}
        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-5 shadow-xl">
          <h2 class="text-xs font-bold uppercase tracking-wider text-white mb-3">
            Payout Bank Details
          </h2>

          <form action="/partner/profile/bank" method="post" class="space-y-3.5">
            <div>
              <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
                Bank / Provider
              </label>
              <select
                name="bank_id"
                required
                class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white focus:outline-none focus:border-white transition-colors"
              >
                <option value="">Select Bank / Mobile Wallet</option>
                {banks.map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    selected={bankDetails?.bank_id === b.id}
                  >
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
                Account Holder Full Name
              </label>
              <input
                type="text"
                name="account_holder_name"
                value={bankDetails?.account_holder_name || `${user.first_name} ${user.father_name}`}
                required
                placeholder="Full name as written on bank book"
                class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
                Account Number / Telebirr Mobile
              </label>
              <input
                type="text"
                name="account_number"
                value={bankDetails?.account_number || ''}
                required
                placeholder="e.g. 1000123456789 or 0911223344"
                class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              class="w-full py-3.5 px-6 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full active:scale-[0.98] transition-transform shadow-md"
            >
              Save Bank Details
            </button>
          </form>
        </div>

        <div class="pt-4 text-center">
          <a
            href="/logout"
            class="inline-block px-6 py-2.5 border border-[#262626] text-xs font-semibold text-[#888888] hover:text-white rounded-full uppercase tracking-wider transition-colors"
          >
            Sign Out
          </a>
        </div>
      </div>
    </BaseLayout>
  );
};
