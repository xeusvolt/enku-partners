// Admin Workspace Views — Executive Monochrome Multi-Column Design
import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';
import type { User, Referral, PayoutBatch, PayoutBatchItem, PayoutBatchGroupedItem, PartnerCommissionRate, Bank, PasswordReset } from '../types';
import { formatEthiopianPhoneDisplay } from '../lib/phone';

interface AdminLeadsViewProps {
  user: User;
  leads: Referral[];
  currentFilter: string;
  message?: string;
}

export const AdminLeadsView: FC<AdminLeadsViewProps> = ({ user, leads, currentFilter, message }) => {
  return (
    <BaseLayout title="Admin — Referrals & Leads" activeNav="admin-leads" isAdmin userFirstName={user.first_name}>
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-white uppercase">Referral Leads Audit</h1>
            <p class="text-xs text-[#888888] mt-1">Review incoming referrals, verify integrity, and lock immutable commission rates.</p>
          </div>

          <div class="flex items-center space-x-2">
            <span class="text-xs text-[#888888]">Filter:</span>
            <div class="inline-flex rounded-full border border-[#262626] bg-[#0A0A0A] p-1 text-xs">
              <a
                href="/admin/leads?status="
                class={`px-3.5 py-1 rounded-full transition-colors ${
                  !currentFilter ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                All
              </a>
              <a
                href="/admin/leads?status=pending"
                class={`px-3.5 py-1 rounded-full transition-colors ${
                  currentFilter === 'pending' ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                Pending
              </a>
              <a
                href="/admin/leads?status=approved"
                class={`px-3.5 py-1 rounded-full transition-colors ${
                  currentFilter === 'approved' ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                Approved
              </a>
              <a
                href="/admin/leads?status=rejected"
                class={`px-3.5 py-1 rounded-full transition-colors ${
                  currentFilter === 'rejected' ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                Rejected
              </a>
            </div>
          </div>
        </div>

        {message && (
          <div class="p-3.5 bg-[#161616] border border-white/20 rounded-xl text-xs text-white">
            {message}
          </div>
        )}

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                  <th class="py-3.5 px-4">Lead Name & Phone</th>
                  <th class="py-3.5 px-4">Role Type</th>
                  <th class="py-3.5 px-4">Referring Partner</th>
                  <th class="py-3.5 px-4">Submitted</th>
                  <th class="py-3.5 px-4">Commission</th>
                  <th class="py-3.5 px-4">Status</th>
                  <th class="py-3.5 px-4">Payout</th>
                  <th class="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1A1A1A]">
                {leads.length === 0 ? (
                  <tr>
                    <td colspan={8} class="py-8 text-center text-[#666666]">
                      No referral records found for this filter.
                    </td>
                  </tr>
                ) : (
                  leads.map((l) => (
                    <tr key={l.id} class="hover:bg-[#121212]/50 transition-colors">
                      <td class="py-3.5 px-4">
                        <span class="font-semibold text-white block">{l.full_name}</span>
                        <span class="font-mono text-[#888888] text-[11px]">{formatEthiopianPhoneDisplay(l.phone_number)}</span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="inline-block text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#333333] text-white">
                          {l.role_type}
                        </span>
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="text-white block font-medium">{l.partner_first_name} {l.partner_father_name}</span>
                        <span class="font-mono text-[#888888] text-[11px]">{l.partner_phone ? formatEthiopianPhoneDisplay(l.partner_phone) : ''}</span>
                      </td>
                      <td class="py-3.5 px-4 text-[#888888]">
                        {new Date(l.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td class="py-3.5 px-4">
                        <span class="font-mono font-bold text-white">
                          {l.commission_earned_etb} <span class="text-[10px] font-normal text-[#888888]">ETB</span>
                        </span>
                      </td>
                      <td class="py-3.5 px-4">
                        {l.status === 'pending' && (
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border border-[#333333] text-[#A1A1AA]">
                            Pending
                          </span>
                        )}
                        {l.status === 'approved' && (
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border border-white text-white font-medium">
                            Approved
                          </span>
                        )}
                        {l.status === 'rejected' && (
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-[#1C1C1C] text-[#666666]">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td class="py-3.5 px-4">
                        {l.payout_status === 'paid' ? (
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-white text-black font-semibold">
                            Paid
                          </span>
                        ) : l.payout_status === 'processing' ? (
                          <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider border border-white/60 text-white">
                            Processing
                          </span>
                        ) : (
                          <span class="text-[#666666] text-[11px]">Unpaid</span>
                        )}
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        {l.status === 'pending' ? (
                          <div class="flex items-center justify-end space-x-2">
                            <form
                              action={`/admin/leads/${l.id}/approve`}
                              method="post"
                              class="inline"
                              data-confirm={`CONFIRM LEAD APPROVAL:\n\nAre you sure you want to approve referral lead for "${l.full_name}"?\nThis locks the commission rate into the payout ledger.`}
                              data-confirm-title="Confirm Lead Approval"
                              data-confirm-subtitle="Lock immutable commission rate"
                            >
                              <button
                                type="submit"
                                class="px-4 py-1.5 bg-white text-black font-bold text-[11px] uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-sm"
                              >
                                Approve
                              </button>
                            </form>
                            <form action={`/admin/leads/${l.id}/reject`} method="post" class="inline">
                              <button
                                type="submit"
                                class="px-4 py-1.5 border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555] text-[11px] font-semibold uppercase tracking-wider rounded-full active:scale-95 transition-all"
                              >
                                Reject
                              </button>
                            </form>
                          </div>
                        ) : (
                          <span class="text-[11px] text-[#555555]">Locked</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

interface AdminPartnersViewProps {
  user: User;
  partners: User[];
  message?: string;
}

export const AdminPartnersView: FC<AdminPartnersViewProps> = ({ user, partners, message }) => {
  const pending = partners.filter((p) => p.status === 'pending');
  const activeAndOther = partners.filter((p) => p.status !== 'pending');

  return (
    <BaseLayout title="Admin — Partner Matrix" activeNav="admin-partners" isAdmin userFirstName={user.first_name}>
      <div class="space-y-8">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white uppercase">Partner Network & Matrix</h1>
          <p class="text-xs text-[#888888] mt-1">Review onboarding applications, manage partner status, and calibrate custom commission rates.</p>
        </div>

        {message && (
          <div class="p-3.5 bg-[#161616] border border-white/20 rounded-xl text-xs text-white">
            {message}
          </div>
        )}

        {/* Section 1: Pending Partner Applications */}
        {pending.length > 0 && (
          <div class="space-y-3">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <h2 class="text-xs font-bold uppercase tracking-wider text-white">
                Pending Verification ({pending.length})
              </h2>
            </div>

            <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                    <th class="py-3 px-4">Partner Name</th>
                    <th class="py-3 px-4">Phone Number</th>
                    <th class="py-3 px-4">Email</th>
                    <th class="py-3 px-4">Registered Date</th>
                    <th class="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#1A1A1A]">
                  {pending.map((p) => (
                    <tr key={p.id} class="hover:bg-[#121212]/50 transition-colors">
                      <td class="py-3.5 px-4 font-semibold text-white">
                        {p.first_name} {p.father_name}
                      </td>
                      <td class="py-3.5 px-4 font-mono text-[#A1A1AA]">
                        {formatEthiopianPhoneDisplay(p.phone_number)}
                      </td>
                      <td class="py-3.5 px-4 text-[#888888]">
                        {p.email || '—'}
                      </td>
                      <td class="py-3.5 px-4 text-[#888888]">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end space-x-2">
                          <form action={`/admin/partners/${p.id}/approve`} method="post" class="inline">
                            <button
                              type="submit"
                              class="px-4 py-1.5 bg-white text-black font-bold text-[11px] uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-sm"
                            >
                              Approve & SMS
                            </button>
                          </form>
                          <form action={`/admin/partners/${p.id}/reject`} method="post" class="inline">
                            <button
                              type="submit"
                              class="px-4 py-1.5 border border-[#333333] text-[#888888] hover:text-white text-[11px] font-semibold uppercase tracking-wider rounded-full active:scale-95 transition-all"
                            >
                              Reject
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 2: All Active & Registered Partners */}
        <div class="space-y-3">
          <h2 class="text-xs font-bold uppercase tracking-wider text-white">
            Active Affiliate Network ({activeAndOther.length})
          </h2>

          <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                  <th class="py-3 px-4">Partner Name</th>
                  <th class="py-3 px-4">Phone Number</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Joined Date</th>
                  <th class="py-3 px-4 text-right">Commission & State</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1A1A1A]">
                {activeAndOther.length === 0 ? (
                  <tr>
                    <td colspan={5} class="py-8 text-center text-[#666666]">
                      No active partners found.
                    </td>
                  </tr>
                ) : (
                  activeAndOther.map((p) => (
                    <tr key={p.id} class="hover:bg-[#121212]/50 transition-colors">
                      <td class="py-3.5 px-4 font-semibold text-white">
                        {p.first_name} {p.father_name}
                      </td>
                      <td class="py-3.5 px-4 font-mono text-[#A1A1AA]">
                        {formatEthiopianPhoneDisplay(p.phone_number)}
                      </td>
                      <td class="py-3.5 px-4">
                        <span
                          class={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${
                            p.status === 'active'
                              ? 'bg-white text-black'
                              : 'border border-[#333333] text-[#666666]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-[#888888]">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <div class="flex items-center justify-end space-x-2">
                          <a
                            href={`/admin/partners/${p.id}/commissions`}
                            class="px-3.5 py-1.5 border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555] rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors"
                          >
                            Set Rates Matrix
                          </a>
                          <form action={`/admin/partners/${p.id}/toggle-status`} method="post" class="inline">
                            <button
                              type="submit"
                              class="px-3.5 py-1.5 border border-[#262626] text-[#666666] hover:text-white rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors"
                            >
                              {p.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

interface AdminPartnerCommissionsViewProps {
  user: User;
  partner: User;
  rates: PartnerCommissionRate[];
  message?: string;
}

export const AdminPartnerCommissionsView: FC<AdminPartnerCommissionsViewProps> = ({
  user,
  partner,
  rates,
  message
}) => {
  const getRate = (role: string) => rates.find((r) => r.role_type === role)?.rate_etb || (role === 'Customer' ? 500 : role === 'Helper' ? 300 : 1000);

  return (
    <BaseLayout title="Set Commission Rates" activeNav="admin-partners" isAdmin userFirstName={user.first_name}>
      <div class="max-w-xl mx-auto space-y-6">
        <div>
          <a href="/admin/partners" class="text-xs text-[#888888] hover:text-white mb-2 inline-block">
            ← Back to Partner Matrix
          </a>
          <h1 class="text-lg font-bold tracking-tight text-white uppercase">Commission Rates Calibration</h1>
          <p class="text-xs text-[#888888] mt-0.5">
            Set fixed ETB compensation for <strong class="text-white">{partner.first_name} {partner.father_name}</strong> ({formatEthiopianPhoneDisplay(partner.phone_number)})
          </p>
        </div>

        {message && (
          <div class="p-3.5 bg-[#161616] border border-white/20 rounded-xl text-xs text-white">
            {message}
          </div>
        )}

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl">
          <form action={`/admin/partners/${partner.id}/commissions`} method="post" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-white mb-1">
                Customer Referral Rate (ETB)
              </label>
              <div class="relative">
                <input
                  type="number"
                  step="any"
                  name="rate_customer"
                  value={getRate('Customer')}
                  required
                  class="w-full pl-3.5 pr-12 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white font-mono focus:outline-none focus:border-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-[#888888] font-mono">ETB</span>
              </div>
              <span class="text-[10px] text-[#666666] mt-1 block">Paid when a hiring customer lead is approved</span>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-white mb-1">
                Helper Referral Rate (ETB)
              </label>
              <div class="relative">
                <input
                  type="number"
                  step="any"
                  name="rate_helper"
                  value={getRate('Helper')}
                  required
                  class="w-full pl-3.5 pr-12 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white font-mono focus:outline-none focus:border-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-[#888888] font-mono">ETB</span>
              </div>
              <span class="text-[10px] text-[#666666] mt-1 block">Paid when a domestic worker/helper lead is approved</span>
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-white mb-1">
                Broker Referral Rate (ETB)
              </label>
              <div class="relative">
                <input
                  type="number"
                  step="any"
                  name="rate_broker"
                  value={getRate('Broker')}
                  required
                  class="w-full pl-3.5 pr-12 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white font-mono focus:outline-none focus:border-white transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-[#888888] font-mono">ETB</span>
              </div>
              <span class="text-[10px] text-[#666666] mt-1 block">Paid when an agency / broker lead is approved</span>
            </div>

            <div class="pt-2">
              <button
                type="submit"
                class="w-full py-3.5 px-6 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md"
              >
                Save Commission Matrix
              </button>
            </div>
          </form>
        </div>
      </div>
    </BaseLayout>
  );
};

interface AdminPayoutsViewProps {
  user: User;
  batches: PayoutBatch[];
  unpaidReferrals: Referral[];
  dateFrom?: string;
  dateTo?: string;
  message?: string;
}

export const AdminPayoutsView: FC<AdminPayoutsViewProps> = ({
  user,
  batches,
  unpaidReferrals,
  dateFrom = '',
  dateTo = '',
  message
}) => {
  const totalUnpaidAmount = unpaidReferrals.reduce((sum, r) => sum + (r.commission_earned_etb || 0), 0);

  return (
    <BaseLayout title="Admin — Batch Payouts" activeNav="admin-payouts" isAdmin userFirstName={user.first_name}>
      <div class="space-y-8">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white uppercase">Batch Payout Engine</h1>
          <p class="text-xs text-[#888888] mt-1">Aggregate approved commissions, generate disbursement batch slips, and export banking files.</p>
        </div>

        {message && (
          <div class="p-3.5 bg-[#161616] border border-white/20 rounded-xl text-xs text-white">
            {message}
          </div>
        )}

        {/* Section 0: Approval Date Filter Range */}
        <div class="p-6 bg-[#0A0A0A] border border-[#262626] rounded-2xl shadow-xl">
          <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 class="text-xs font-bold uppercase tracking-wider text-white">Filter Leads by Approval Date</h2>
              <p class="text-xs text-[#888888] mt-1">Select date bounds to filter approved unpaid commissions for batch generation.</p>
            </div>
            <form action="/admin/payouts" method="get" class="flex flex-wrap items-center gap-3">
              <div>
                <label class="block text-[10px] uppercase font-semibold text-[#888888] mb-1">Start Date</label>
                <input
                  type="date"
                  name="date_from"
                  value={dateFrom}
                  class="px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>
              <div>
                <label class="block text-[10px] uppercase font-semibold text-[#888888] mb-1">End Date</label>
                <input
                  type="date"
                  name="date_to"
                  value={dateTo}
                  class="px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>
              <div class="flex items-center space-x-2 pt-4 md:pt-0">
                <button
                  type="submit"
                  class="px-5 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-sm"
                >
                  Filter Leads
                </button>
                {(dateFrom || dateTo) && (
                  <a
                    href="/admin/payouts"
                    class="px-4 py-2 border border-[#333333] hover:border-white text-xs font-semibold uppercase tracking-wider rounded-full text-[#888888] hover:text-white transition-colors"
                  >
                    Clear Filter
                  </a>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Section 1: Ready for Disbursement */}
        <div class="p-6 bg-[#0A0A0A] border border-[#262626] rounded-2xl shadow-xl">
          {unpaidReferrals.length === 0 ? (
            <div>
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1E1E1E]">
                <div>
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">Pending Disbursement Pool</span>
                  <div class="mt-1 flex items-baseline space-x-2">
                    <span class="text-2xl font-bold text-white tracking-tight font-mono">0</span>
                    <span class="text-xs font-mono text-[#888888]">ETB</span>
                  </div>
                  <span class="text-xs text-[#666666] mt-0.5 block">
                    0 approved referrals ready for batching {dateFrom || dateTo ? `(filtered ${dateFrom || 'start'} to ${dateTo || 'now'})` : ''}
                  </span>
                </div>
              </div>
              <div class="py-8 text-center text-xs text-[#666666]">
                No approved unpaid leads found for disbursement.
              </div>
            </div>
          ) : (
            <form
              id="batch-generate-form"
              action="/admin/payouts/generate"
              method="post"
              data-confirm={`CONFIRM BATCH GENERATION:\n\nAre you sure you want to generate a payout batch for ${unpaidReferrals.length} selected leads (${totalUnpaidAmount.toLocaleString()} ETB)?\n\nThey will transition to PROCESSING status.`}
              data-confirm-title="Confirm Batch Generation"
              data-confirm-subtitle="Move selected leads to processing state for banking transfer"
            >
              <input type="hidden" name="date_from" value={dateFrom} />
              <input type="hidden" name="date_to" value={dateTo} />
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1E1E1E]">
                <div>
                  <span class="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">Pending Disbursement Pool</span>
                  <div class="mt-1 flex items-baseline space-x-2">
                    <span id="pool-total-display" class="text-2xl font-bold text-white tracking-tight font-mono">{totalUnpaidAmount.toLocaleString()}</span>
                    <span class="text-xs font-mono text-[#888888]">ETB</span>
                  </div>
                  <span class="text-xs text-[#666666] mt-0.5 block">
                    <span id="selected-leads-count">{unpaidReferrals.length}</span> of {unpaidReferrals.length} leads selected {dateFrom || dateTo ? `(filtered ${dateFrom || 'start'} to ${dateTo || 'now'})` : ''}
                  </span>
                </div>

                <div>
                  <button
                    type="submit"
                    id="master-generate-btn"
                    class="px-8 py-3 whitespace-nowrap bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:scale-100"
                  >
                    Generate Payout Batch for Selected
                  </button>
                </div>
              </div>

              <div class="mt-4 overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="text-[#888888] text-[10px] uppercase font-semibold border-b border-[#222222]">
                      <th class="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          id="select-all-leads"
                          checked
                          class="w-4 h-4 rounded border-[#333333] bg-[#161616] text-white focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white"
                          title="Select / Deselect All Leads"
                        />
                      </th>
                      <th class="py-2.5">Partner</th>
                      <th class="py-2.5">Lead</th>
                      <th class="py-2.5">Role</th>
                      <th class="py-2.5">Approved Date</th>
                      <th class="py-2.5 text-right pr-2">Commission</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#161616]">
                    {unpaidReferrals.map((r) => (
                      <tr key={r.id} class="hover:bg-white/[0.02] transition-colors">
                        <td class="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            name="referral_ids"
                            value={r.id}
                            data-amount={r.commission_earned_etb}
                            checked
                            class="lead-checkbox w-4 h-4 rounded border-[#333333] bg-[#161616] text-white focus:ring-0 focus:ring-offset-0 cursor-pointer accent-white"
                          />
                        </td>
                        <td class="py-2.5 text-white font-medium">{r.partner_first_name} {r.partner_father_name}</td>
                        <td class="py-2.5 text-[#888888]">{r.full_name}</td>
                        <td class="py-2.5">
                          <span class="inline-block text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#333333] text-white">
                            {r.role_type}
                          </span>
                        </td>
                        <td class="py-2.5 text-[#888888] font-mono text-[11px]">
                          {r.approved_at ? new Date(r.approved_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
                        </td>
                        <td class="py-2.5 text-right font-mono font-bold text-white pr-2">{r.commission_earned_etb} ETB</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <script dangerouslySetInnerHTML={{
                __html: `
                  (function() {
                    var selectAll = document.getElementById('select-all-leads');
                    var form = document.getElementById('batch-generate-form');
                    var masterBtn = document.getElementById('master-generate-btn');
                    var countDisplay = document.getElementById('selected-leads-count');
                    var poolTotalDisplay = document.getElementById('pool-total-display');
                    if (!form) return;

                    function getCheckboxes() {
                      return Array.prototype.slice.call(form.querySelectorAll('.lead-checkbox'));
                    }

                    function updateState() {
                      var checkboxes = getCheckboxes();
                      var selected = checkboxes.filter(function(cb) { return cb.checked; });
                      var selectedCount = selected.length;

                      if (countDisplay) {
                        countDisplay.textContent = selectedCount.toString();
                      }

                      if (selectAll) {
                        selectAll.checked = checkboxes.length > 0 && selectedCount === checkboxes.length;
                        selectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
                      }

                      if (masterBtn) {
                        masterBtn.disabled = selectedCount === 0;
                        masterBtn.textContent = 'Generate Payout Batch for Selected' + (selectedCount > 0 ? ' (' + selectedCount + ')' : '');
                      }

                      var totalSelectedAmount = 0;
                      selected.forEach(function(cb) {
                        var amt = parseFloat(cb.getAttribute('data-amount') || '0');
                        if (!isNaN(amt)) totalSelectedAmount += amt;
                      });

                      if (poolTotalDisplay) {
                        poolTotalDisplay.textContent = totalSelectedAmount.toLocaleString();
                      }

                      form.setAttribute('data-confirm', 'CONFIRM BATCH GENERATION:\\n\\nAre you sure you want to generate a payout batch for ' + selectedCount + ' selected leads (' + totalSelectedAmount.toLocaleString() + ' ETB)?\\n\\nThey will transition to PROCESSING status.');
                    }

                    if (selectAll) {
                      selectAll.addEventListener('change', function() {
                        var checkboxes = getCheckboxes();
                        for (var i = 0; i < checkboxes.length; i++) {
                          checkboxes[i].checked = selectAll.checked;
                        }
                        updateState();
                      });
                    }

                    form.addEventListener('change', function(e) {
                      if (e.target && e.target.classList && e.target.classList.contains('lead-checkbox')) {
                        updateState();
                      }
                    });

                    form.addEventListener('submit', function(e) {
                      var checkboxes = getCheckboxes();
                      var selected = checkboxes.filter(function(cb) { return cb.checked; });
                      if (selected.length === 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        alert('No leads selected. Please select at least one referral lead to generate a payout batch.');
                        return false;
                      }
                    });

                    updateState();
                  })();
                `
              }} />
            </form>
          )}
        </div>

        {/* Section 2: Payout Batches History */}
        <div class="space-y-3">
          <h2 class="text-xs font-bold uppercase tracking-wider text-white">
            Disbursement Batches History ({batches.length})
          </h2>

          <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                  <th class="py-3 px-4">Batch Reference</th>
                  <th class="py-3 px-4">Created Date</th>
                  <th class="py-3 px-4">Item Count</th>
                  <th class="py-3 px-4">Total Amount</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1A1A1A]">
                {batches.length === 0 ? (
                  <tr>
                    <td colspan={6} class="py-8 text-center text-[#666666]">
                      No payout batches generated yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} class="hover:bg-[#121212]/50 transition-colors">
                      <td class="py-3.5 px-4 font-mono font-bold text-white">
                        {b.batch_reference}
                      </td>
                      <td class="py-3.5 px-4 text-[#888888]">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                      <td class="py-3.5 px-4 text-white">
                        {b.item_count} items
                      </td>
                      <td class="py-3.5 px-4 font-mono font-bold text-white">
                        {b.total_amount_etb.toLocaleString()} ETB
                      </td>
                      <td class="py-3.5 px-4">
                        <span
                          class={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${
                            b.status === 'completed'
                              ? 'bg-white text-black font-semibold'
                              : b.status === 'cancelled'
                              ? 'bg-[#1C1C1C] text-[#666666] border border-[#2E2E2E]'
                              : 'border border-white/60 text-white'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <a
                          href={`/admin/payouts/${b.id}`}
                          class="px-4 py-1.5 bg-white text-black font-bold text-[11px] uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-sm"
                        >
                          Open Slip
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

interface AdminBatchDetailViewProps {
  user: User;
  batch: PayoutBatch;
  groupedItems: PayoutBatchGroupedItem[];
  message?: string;
}

export const AdminBatchDetailView: FC<AdminBatchDetailViewProps> = ({
  user,
  batch,
  groupedItems,
  message
}) => {
  return (
    <BaseLayout title={`Batch ${batch.batch_reference}`} activeNav="admin-payouts" isAdmin userFirstName={user.first_name}>
      <div class="space-y-6">
        {/* Navigation & Action Bar */}
        <div class="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#262626]">
          <div>
            <a href="/admin/payouts" class="text-xs text-[#888888] hover:text-white mb-1 inline-block">
              ← Back to Batch Engine
            </a>
            <h1 class="text-xl font-bold tracking-tight text-white font-mono uppercase">
              {batch.batch_reference}
            </h1>
            <p class="text-xs text-[#888888]">
              Created on {new Date(batch.created_at).toLocaleString()} • Status: <span class="uppercase font-semibold text-white">{batch.status}</span>
            </p>
          </div>

          <div class="flex items-center space-x-2">
            <button
              onclick="window.print()"
              class="px-5 py-2 border border-[#333333] hover:border-white text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-colors active:scale-95"
            >
              Print Payout Slip
            </button>
            <a
              href={`/admin/payouts/${batch.id}/export.csv`}
              class="px-5 py-2 border border-[#333333] hover:border-white text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-colors active:scale-95"
            >
              Export CSV
            </a>
            {batch.status === 'processing' && (
              <form
                action={`/admin/payouts/${batch.id}/complete`}
                method="post"
                class="inline"
                data-confirm={`CONFIRM BATCH DISBURSEMENT:\n\nAre you sure you want to mark payout batch ${batch.batch_reference} as COMPLETED?\n\nAll ${batch.item_count} associated partner leads (${batch.total_amount_etb.toLocaleString()} ETB) across ${groupedItems.length} partners will be permanently and immutably marked as PAID.`}
                data-confirm-title="Confirm Batch Disbursement"
                data-confirm-subtitle="Disburse funds and complete batch"
              >
                <button
                  type="submit"
                  class="px-5 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-md"
                >
                  Complete Batch & Mark Paid
                </button>
              </form>
            )}
          </div>
        </div>

        {message && (
          <div class="no-print p-3.5 bg-[#161616] border border-white/20 rounded-xl text-xs text-white">
            {message}
          </div>
        )}

        {/* Batch Overview Cards */}
        <div class="no-print grid grid-cols-3 gap-4">
          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl">
            <span class="text-[10px] font-medium uppercase tracking-wider text-[#888888]">Disbursement Total</span>
            <div class="mt-1 flex items-baseline space-x-1.5">
              <span class="text-xl font-bold text-white font-mono">{batch.total_amount_etb.toLocaleString()}</span>
              <span class="text-xs text-[#888888] font-mono">ETB</span>
            </div>
          </div>
          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl">
            <span class="text-[10px] font-medium uppercase tracking-wider text-[#888888]">Aggregated Partners</span>
            <div class="mt-1 text-xl font-bold text-white font-mono">{groupedItems.length} partners ({batch.item_count} leads)</div>
          </div>
          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl">
            <span class="text-[10px] font-medium uppercase tracking-wider text-[#888888]">Lifecycle State</span>
            <div class="mt-1 text-sm font-bold text-white uppercase tracking-wider">{batch.status}</div>
          </div>
        </div>

        {/* Printable Slip Header (Visible only on print or clean view) */}
        <div class="hidden print-only mb-6 text-black">
          <div class="border-b-2 border-black pb-4 mb-4">
            <h1 class="text-2xl font-bold tracking-tight uppercase">ENKU MEFTIHE — PARTNER PAYOUT SLIP</h1>
            <p class="text-sm text-gray-700">Official Banking & Telebirr Bulk Transfer Authorization</p>
          </div>
          <div class="grid grid-cols-2 text-sm gap-2 mb-4">
            <div><strong>Batch Reference:</strong> {batch.batch_reference}</div>
            <div><strong>Date Generated:</strong> {new Date(batch.created_at).toLocaleString()}</div>
            <div><strong>Total Partners:</strong> {groupedItems.length}</div>
            <div><strong>Total Leads:</strong> {batch.item_count}</div>
            <div><strong>Total Amount:</strong> {batch.total_amount_etb.toLocaleString()} ETB</div>
          </div>
        </div>

        {/* Detailed Aggregated Partner Table */}
        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
          <table class="w-full text-left text-xs border-collapse print-table">
            <thead>
              <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                <th class="py-3 px-4">Partner Name</th>
                <th class="py-3 px-4">Phone</th>
                <th class="py-3 px-4">Bank Name</th>
                <th class="py-3 px-4">Account Number</th>
                <th class="py-3 px-4">Total Leads</th>
                <th class="py-3 px-4">Aggregated Total ETB</th>
                <th class="no-print py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1A1A1A]">
              {groupedItems.length === 0 ? (
                <tr>
                  <td colspan={7} class="py-8 text-center text-[#666666]">
                    No partner lines found in this payout batch.
                  </td>
                </tr>
              ) : (
                groupedItems.map((item) => (
                  <tr key={item.partner_id} class="hover:bg-[#121212]/50 transition-colors">
                    <td class="py-3.5 px-4 font-semibold text-white">
                      {item.partner_name}
                      {item.account_holder && item.account_holder !== 'N/A' && (
                        <span class="block text-[10px] text-[#888888] font-normal">Holder: {item.account_holder}</span>
                      )}
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[#A1A1AA]">
                      {formatEthiopianPhoneDisplay(item.partner_phone)}
                    </td>
                    <td class="py-3.5 px-4 text-white">
                      {item.bank_name}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-white">
                      {item.account_number}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-white">
                      {item.lead_count} {item.lead_count === 1 ? 'lead' : 'leads'}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-white">
                      {item.total_amount_etb.toLocaleString()} ETB
                    </td>
                    <td class="no-print py-3.5 px-4 text-right">
                      {batch.status === 'processing' ? (
                        <form
                          action={`/admin/payouts/${batch.id}/reject-partner/${item.partner_id}`}
                          method="post"
                          class="inline"
                          data-confirm={`REJECT PARTNER GROUP:\n\nAre you sure you want to reject all ${item.lead_count} leads for "${item.partner_name}" (${item.total_amount_etb.toLocaleString()} ETB) from this batch?\n\nAll ${item.lead_count} leads will revert to UNPAID status, and the batch totals will be decremented.`}
                          data-confirm-title="Reject Partner Leads"
                          data-confirm-subtitle="Revert all partner leads back to unpaid pool"
                        >
                          <button
                            type="submit"
                            title="Reject all partner leads back to unpaid"
                            class="px-4 py-1.5 border border-[#333333] text-[#888888] hover:text-white hover:border-[#666666] text-[10px] font-semibold uppercase tracking-wider rounded-full active:scale-95 transition-all"
                          >
                            Reject Group
                          </button>
                        </form>
                      ) : (
                        <span class="text-[10px] text-[#555555]">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Printable Signature Section */}
        <div class="hidden print-only mt-12 text-black grid grid-cols-2 gap-8 text-xs">
          <div class="border-t border-black pt-2">
            <strong>Prepared By:</strong> {user.first_name} {user.father_name} (Administrator)
          </div>
          <div class="border-t border-black pt-2">
            <strong>Authorized Officer Signature:</strong> _______________________
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

interface AdminBanksViewProps {
  user: User;
  banks: Bank[];
  message?: string;
  error?: string;
}

export const AdminBanksView: FC<AdminBanksViewProps> = ({ user, banks, message, error }) => {
  return (
    <BaseLayout title="Admin — Bank Catalog" activeNav="admin-banks" isAdmin userFirstName={user.first_name}>
      <div class="space-y-8">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white uppercase">Bank Catalog Management</h1>
          <p class="text-xs text-[#888888] mt-1">
            Manage supported commercial banks and digital payment providers for partner disbursements.
          </p>
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

        {/* Add Bank Card */}
        <div class="p-6 bg-[#0A0A0A] border border-[#262626] rounded-2xl shadow-xl">
          <h2 class="text-xs font-bold uppercase tracking-wider text-white mb-3">Add Supported Bank / Payment Method</h2>
          <form action="/admin/banks" method="post" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Oromia International Bank"
              class="w-full sm:max-w-md px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              class="w-full sm:w-auto px-8 py-3 whitespace-nowrap bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-95 transition-all shrink-0 shadow-sm"
            >
              Add Bank
            </button>
          </form>
        </div>

        {/* Banks Catalog Table */}
        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                <th class="py-3 px-4 w-16">ID</th>
                <th class="py-3 px-4">Bank / Provider Name</th>
                <th class="py-3 px-4 w-32">Status</th>
                <th class="py-3 px-4 text-right w-64">Catalog Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1A1A1A]">
              {banks.length === 0 ? (
                <tr>
                  <td colspan={4} class="py-8 text-center text-[#666666]">
                    No banks configured in the catalog.
                  </td>
                </tr>
              ) : (
                banks.map((b) => (
                  <tr key={b.id} class="hover:bg-[#121212]/50 transition-colors">
                    <td class="py-3.5 px-4 font-mono text-[#888888]">
                      #{b.id}
                    </td>
                    <td class="py-3.5 px-4">
                      {/* Inline Edit Form */}
                      <form action={`/admin/banks/${b.id}/edit`} method="post" class="flex items-center space-x-2">
                        <input
                          type="text"
                          name="name"
                          value={b.name}
                          required
                          class="px-3 py-1.5 bg-[#121212] border border-[#262626] focus:border-white rounded-xl text-xs text-white font-medium max-w-xs transition-colors"
                        />
                        <button
                          type="submit"
                          class="px-3.5 py-1.5 border border-[#333333] hover:border-white text-[10px] font-semibold uppercase tracking-wider rounded-full text-[#888888] hover:text-white transition-colors"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td class="py-3.5 px-4">
                      <span
                        class={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${
                          b.is_active === 1
                            ? 'bg-white text-black'
                            : 'border border-[#333333] text-[#666666]'
                        }`}
                      >
                        {b.is_active === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <form
                        action={`/admin/banks/${b.id}/toggle`}
                        method="post"
                        class="inline"
                        data-confirm={`CONFIRM BANK STATUS TOGGLE:\n\nAre you sure you want to ${b.is_active === 1 ? 'DISABLE' : 'ENABLE'} ${b.name}?\n\n${b.is_active === 1 ? 'Partners will no longer be able to select this bank.' : 'Partners will be able to select this bank.'}`}
                        data-confirm-title="Toggle Bank Status"
                        data-confirm-subtitle="Modify bank catalog availability"
                      >
                        <button
                          type="submit"
                          class={`px-4 py-1.5 text-[10px] uppercase tracking-wider rounded-full font-bold transition-all active:scale-95 ${
                            b.is_active === 1
                              ? 'border border-[#333333] text-[#888888] hover:text-white hover:border-[#666666]'
                              : 'bg-white text-black hover:bg-[#EAEAEA]'
                          }`}
                        >
                          {b.is_active === 1 ? 'Disable' : 'Enable'}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </BaseLayout>
  );
};

// ============================================================
// Password Resets Dashboard View
// ============================================================

interface AdminPasswordResetsViewProps {
  user: User;
  pendingResets: PasswordReset[];
  recentResets: PasswordReset[];
  message?: string;
  error?: string;
}

export const AdminPasswordResetsView: FC<AdminPasswordResetsViewProps> = ({
  user,
  pendingResets,
  recentResets,
  message,
  error
}) => {
  return (
    <BaseLayout title="Admin — Password Resets" activeNav="admin-resets" isAdmin userFirstName={user.first_name}>
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <h1 class="text-xl font-bold tracking-tight text-white uppercase">Password Reset Requests</h1>
            <p class="text-xs text-[#888888] mt-1">
              Review and authorize partner password resets. Approving generates a cryptographically secure 1-hour token and dispatches an SMS.
            </p>
          </div>
          <div class="flex items-center space-x-2">
            <span class="px-3.5 py-1.5 rounded-full border border-[#262626] bg-[#0A0A0A] text-xs font-mono text-[#888888]">
              {pendingResets.length} Pending
            </span>
          </div>
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

        {/* Pending Requests Table */}
        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
          <div class="px-5 py-3.5 border-b border-[#262626] bg-[#121212]/50 flex items-center justify-between">
            <h2 class="text-xs font-bold uppercase tracking-wider text-white">
              Pending Authorization Queue
            </h2>
          </div>
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                <th class="py-3 px-4">Partner Name</th>
                <th class="py-3 px-4">Phone Number</th>
                <th class="py-3 px-4">Requested At</th>
                <th class="py-3 px-4">Status</th>
                <th class="py-3 px-4 text-right">Authorization</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1A1A1A]">
              {pendingResets.length === 0 ? (
                <tr>
                  <td colspan={5} class="py-8 text-center text-[#666666]">
                    No pending password reset requests. All partner accounts are in good standing.
                  </td>
                </tr>
              ) : (
                pendingResets.map((r) => (
                  <tr key={r.id} class="hover:bg-[#121212]/50 transition-colors">
                    <td class="py-3.5 px-4 font-semibold text-white">
                      {r.user_first_name} {r.user_father_name}
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[#A1A1AA]">
                      {r.user_phone ? formatEthiopianPhoneDisplay(r.user_phone) : '—'}
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[11px] text-[#888888]">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td class="py-3.5 px-4">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-[#1A1A1A] text-white border border-[#333333]">
                        Pending
                      </span>
                    </td>
                    <td class="py-3.5 px-4 text-right">
                      <form
                        action={`/admin/resets/${r.id}/approve`}
                        method="post"
                        class="inline"
                        data-confirm={`CONFIRM PASSWORD RESET APPROVAL:\n\nAre you sure you want to approve the password reset for ${r.user_first_name} ${r.user_father_name} (${r.user_phone ? formatEthiopianPhoneDisplay(r.user_phone) : ''})?\n\nA secure one-time reset link valid for 1 hour will be generated and dispatched via SMS.`}
                        data-confirm-title="Approve Password Reset"
                        data-confirm-subtitle="Generate secure reset link and dispatch SMS"
                      >
                        <button
                          type="submit"
                          class="px-5 py-2 text-xs uppercase tracking-wider rounded-full font-bold whitespace-nowrap bg-white text-black hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-sm"
                        >
                          Approve Reset
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Audit Trail: Recent Password Resets */}
        {recentResets.length > 0 && (
          <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
            <div class="px-5 py-3.5 border-b border-[#262626] bg-[#121212]/50 flex items-center justify-between">
              <h2 class="text-xs font-bold uppercase tracking-wider text-[#888888]">
                Recent Resets History (Audit Trail)
              </h2>
            </div>
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                  <th class="py-3 px-4">Partner Name</th>
                  <th class="py-3 px-4">Phone Number</th>
                  <th class="py-3 px-4">Requested At</th>
                  <th class="py-3 px-4">Expires At</th>
                  <th class="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#1A1A1A]">
                {recentResets.map((r) => (
                  <tr key={r.id} class="hover:bg-[#121212]/50 transition-colors">
                    <td class="py-3 px-4 font-medium text-[#CCCCCC]">
                      {r.user_first_name} {r.user_father_name}
                    </td>
                    <td class="py-3 px-4 font-mono text-[#888888]">
                      {r.user_phone ? formatEthiopianPhoneDisplay(r.user_phone) : '—'}
                    </td>
                    <td class="py-3 px-4 font-mono text-[11px] text-[#666666]">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td class="py-3 px-4 font-mono text-[11px] text-[#666666]">
                      {r.expires_at ? new Date(r.expires_at).toLocaleString() : '—'}
                    </td>
                    <td class="py-3 px-4 text-right">
                      <span
                        class={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                          r.status === 'used'
                            ? 'bg-[#161616] text-[#888888] border border-[#262626]'
                            : r.status === 'approved'
                            ? 'bg-white text-black font-semibold'
                            : 'bg-[#1A1A1A] text-white border border-[#333333]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

