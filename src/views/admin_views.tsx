// Admin Workspace Views — Executive Monochrome Multi-Column Design
import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';
import type { User, Referral, PayoutBatch, PayoutBatchItem, PartnerCommissionRate } from '../types';
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
            <div class="inline-flex rounded border border-[#262626] bg-[#0A0A0A] p-0.5 text-xs">
              <a
                href="/admin/leads?status="
                class={`px-3 py-1 rounded transition-colors ${
                  !currentFilter ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                All
              </a>
              <a
                href="/admin/leads?status=pending"
                class={`px-3 py-1 rounded transition-colors ${
                  currentFilter === 'pending' ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                Pending
              </a>
              <a
                href="/admin/leads?status=approved"
                class={`px-3 py-1 rounded transition-colors ${
                  currentFilter === 'approved' ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                Approved
              </a>
              <a
                href="/admin/leads?status=rejected"
                class={`px-3 py-1 rounded transition-colors ${
                  currentFilter === 'rejected' ? 'bg-white text-black font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                Rejected
              </a>
            </div>
          </div>
        </div>

        {message && (
          <div class="p-3 bg-[#161616] border border-white/20 rounded text-xs text-white">
            {message}
          </div>
        )}

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-lg overflow-hidden shadow-2xl">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                  <th class="py-3 px-4">Lead Name & Phone</th>
                  <th class="py-3 px-4">Role Type</th>
                  <th class="py-3 px-4">Referring Partner</th>
                  <th class="py-3 px-4">Submitted</th>
                  <th class="py-3 px-4">Commission</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4">Payout</th>
                  <th class="py-3 px-4 text-right">Actions</th>
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
                        <span class="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-[#333333] text-white">
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
                          <span class="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-[#333333] text-[#A1A1AA]">
                            Pending
                          </span>
                        )}
                        {l.status === 'approved' && (
                          <span class="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-white text-white font-medium">
                            Approved
                          </span>
                        )}
                        {l.status === 'rejected' && (
                          <span class="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-[#1C1C1C] text-[#666666]">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td class="py-3.5 px-4">
                        {l.payout_status === 'paid' ? (
                          <span class="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-white text-black font-semibold">
                            Paid
                          </span>
                        ) : l.payout_status === 'processing' ? (
                          <span class="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border border-white/60 text-white">
                            Processing
                          </span>
                        ) : (
                          <span class="text-[#666666] text-[11px]">Unpaid</span>
                        )}
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        {l.status === 'pending' ? (
                          <div class="flex items-center justify-end space-x-2">
                            <form action={`/admin/leads/${l.id}/approve`} method="post" class="inline">
                              <button
                                type="submit"
                                class="px-2.5 py-1 bg-white text-black font-semibold text-[11px] uppercase tracking-wider rounded hover:bg-[#EAEAEA] active:scale-95 transition-all"
                              >
                                Approve
                              </button>
                            </form>
                            <form action={`/admin/leads/${l.id}/reject`} method="post" class="inline">
                              <button
                                type="submit"
                                class="px-2.5 py-1 border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555] text-[11px] uppercase tracking-wider rounded active:scale-95 transition-all"
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
          <div class="p-3 bg-[#161616] border border-white/20 rounded text-xs text-white">
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

            <div class="bg-[#0A0A0A] border border-[#262626] rounded-lg overflow-hidden shadow-2xl">
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
                              class="px-3 py-1 bg-white text-black font-semibold text-[11px] uppercase tracking-wider rounded hover:bg-[#EAEAEA] active:scale-95 transition-all"
                            >
                              Approve & SMS
                            </button>
                          </form>
                          <form action={`/admin/partners/${p.id}/reject`} method="post" class="inline">
                            <button
                              type="submit"
                              class="px-3 py-1 border border-[#333333] text-[#888888] hover:text-white text-[11px] uppercase tracking-wider rounded active:scale-95 transition-all"
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

          <div class="bg-[#0A0A0A] border border-[#262626] rounded-lg overflow-hidden shadow-2xl">
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
                          class={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${
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
                            class="px-2.5 py-1 border border-[#333333] text-[#888888] hover:text-white hover:border-[#555555] rounded text-[11px] uppercase tracking-wider"
                          >
                            Set Rates Matrix
                          </a>
                          <form action={`/admin/partners/${p.id}/toggle-status`} method="post" class="inline">
                            <button
                              type="submit"
                              class="px-2.5 py-1 border border-[#262626] text-[#666666] hover:text-white rounded text-[11px] uppercase tracking-wider"
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
          <div class="p-3 bg-[#161616] border border-white/20 rounded text-xs text-white">
            {message}
          </div>
        )}

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-lg p-6 shadow-2xl">
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
                  class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded text-sm text-white font-mono focus:outline-none focus:border-white transition-colors"
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
                  class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded text-sm text-white font-mono focus:outline-none focus:border-white transition-colors"
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
                  class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded text-sm text-white font-mono focus:outline-none focus:border-white transition-colors"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-[#888888] font-mono">ETB</span>
              </div>
              <span class="text-[10px] text-[#666666] mt-1 block">Paid when an agency / broker lead is approved</span>
            </div>

            <div class="pt-2">
              <button
                type="submit"
                class="w-full py-3 bg-white text-black font-semibold text-xs uppercase tracking-wider rounded-lg hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md"
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
  message?: string;
}

export const AdminPayoutsView: FC<AdminPayoutsViewProps> = ({
  user,
  batches,
  unpaidReferrals,
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
          <div class="p-3 bg-[#161616] border border-white/20 rounded text-xs text-white">
            {message}
          </div>
        )}

        {/* Section 1: Ready for Disbursement */}
        <div class="p-6 bg-[#0A0A0A] border border-[#262626] rounded-lg shadow-xl">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#1E1E1E]">
            <div>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">Pending Disbursement Pool</span>
              <div class="mt-1 flex items-baseline space-x-2">
                <span class="text-2xl font-bold text-white tracking-tight font-mono">{totalUnpaidAmount.toLocaleString()}</span>
                <span class="text-xs font-mono text-[#888888]">ETB</span>
              </div>
              <span class="text-xs text-[#666666] mt-0.5 block">{unpaidReferrals.length} approved referrals ready for batching</span>
            </div>

            {unpaidReferrals.length > 0 && (
              <form action="/admin/payouts/generate" method="post">
                {unpaidReferrals.map((r) => (
                  <input key={r.id} type="hidden" name="referral_ids" value={r.id} />
                ))}
                <button
                  type="submit"
                  class="px-5 py-3 bg-white text-black font-semibold text-xs uppercase tracking-wider rounded-lg hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-md"
                >
                  Generate Payout Batch ({unpaidReferrals.length} Leads)
                </button>
              </form>
            )}
          </div>

          {unpaidReferrals.length > 0 && (
            <div class="mt-4 overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="text-[#888888] text-[10px] uppercase font-semibold border-b border-[#222222]">
                    <th class="py-2">Partner</th>
                    <th class="py-2">Lead</th>
                    <th class="py-2">Role</th>
                    <th class="py-2 text-right">Commission</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#161616]">
                  {unpaidReferrals.slice(0, 5).map((r) => (
                    <tr key={r.id}>
                      <td class="py-2 text-white">{r.partner_first_name} {r.partner_father_name}</td>
                      <td class="py-2 text-[#888888]">{r.full_name}</td>
                      <td class="py-2 text-[#888888]">{r.role_type}</td>
                      <td class="py-2 text-right font-mono font-bold text-white">{r.commission_earned_etb} ETB</td>
                    </tr>
                  ))}
                  {unpaidReferrals.length > 5 && (
                    <tr>
                      <td colspan={4} class="py-2 text-center text-[11px] text-[#666666]">
                        + {unpaidReferrals.length - 5} additional leads included in pool
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Payout Batches History */}
        <div class="space-y-3">
          <h2 class="text-xs font-bold uppercase tracking-wider text-white">
            Disbursement Batches History ({batches.length})
          </h2>

          <div class="bg-[#0A0A0A] border border-[#262626] rounded-lg overflow-hidden shadow-2xl">
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
                          class={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${
                            b.status === 'completed'
                              ? 'bg-white text-black'
                              : 'border border-white/60 text-white'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td class="py-3.5 px-4 text-right">
                        <a
                          href={`/admin/payouts/${b.id}`}
                          class="px-3 py-1 bg-white text-black font-semibold text-[11px] uppercase tracking-wider rounded hover:bg-[#EAEAEA] active:scale-95 transition-all"
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
  items: PayoutBatchItem[];
  message?: string;
}

export const AdminBatchDetailView: FC<AdminBatchDetailViewProps> = ({
  user,
  batch,
  items,
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
              class="px-4 py-2 border border-[#333333] hover:border-white text-white font-medium text-xs uppercase tracking-wider rounded transition-colors"
            >
              Print Payout Slip
            </button>
            <a
              href={`/admin/payouts/${batch.id}/export.csv`}
              class="px-4 py-2 border border-[#333333] hover:border-white text-white font-medium text-xs uppercase tracking-wider rounded transition-colors"
            >
              Export CSV
            </a>
            {batch.status === 'processing' && (
              <form action={`/admin/payouts/${batch.id}/complete`} method="post" class="inline">
                <button
                  type="submit"
                  class="px-4 py-2 bg-white text-black font-semibold text-xs uppercase tracking-wider rounded hover:bg-[#EAEAEA] active:scale-95 transition-all shadow-md"
                >
                  Complete Batch & Mark Paid
                </button>
              </form>
            )}
          </div>
        </div>

        {message && (
          <div class="no-print p-3 bg-[#161616] border border-white/20 rounded text-xs text-white">
            {message}
          </div>
        )}

        {/* Batch Overview Cards */}
        <div class="no-print grid grid-cols-3 gap-4">
          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-lg">
            <span class="text-[10px] font-medium uppercase tracking-wider text-[#888888]">Disbursement Total</span>
            <div class="mt-1 flex items-baseline space-x-1.5">
              <span class="text-xl font-bold text-white font-mono">{batch.total_amount_etb.toLocaleString()}</span>
              <span class="text-xs text-[#888888] font-mono">ETB</span>
            </div>
          </div>
          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-lg">
            <span class="text-[10px] font-medium uppercase tracking-wider text-[#888888]">Total Line Items</span>
            <div class="mt-1 text-xl font-bold text-white font-mono">{batch.item_count} items</div>
          </div>
          <div class="p-4 bg-[#0A0A0A] border border-[#262626] rounded-lg">
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
            <div><strong>Total Items:</strong> {batch.item_count}</div>
            <div><strong>Total Amount:</strong> {batch.total_amount_etb.toLocaleString()} ETB</div>
          </div>
        </div>

        {/* Detailed Items Table */}
        <div class="bg-[#0A0A0A] border border-[#262626] rounded-lg overflow-hidden shadow-2xl">
          <table class="w-full text-left text-xs border-collapse print-table">
            <thead>
              <tr class="border-b border-[#262626] bg-[#121212] text-[#888888] uppercase tracking-wider font-semibold text-[10px]">
                <th class="py-3 px-4">Batch Reference</th>
                <th class="py-3 px-4">Partner Name</th>
                <th class="py-3 px-4">Phone</th>
                <th class="py-3 px-4">Bank Name</th>
                <th class="py-3 px-4">Account Holder</th>
                <th class="py-3 px-4">Account Number</th>
                <th class="py-3 px-4">Amount (ETB)</th>
                <th class="no-print py-3 px-4 text-right">Single-Item Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#1A1A1A]">
              {items.length === 0 ? (
                <tr>
                  <td colspan={8} class="py-8 text-center text-[#666666]">
                    No items found in this payout batch.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.referral_id} class="hover:bg-[#121212]/50 transition-colors">
                    <td class="py-3.5 px-4 font-mono text-[#888888] text-[11px]">
                      {item.batch_reference}
                    </td>
                    <td class="py-3.5 px-4 font-semibold text-white">
                      {item.partner_name}
                    </td>
                    <td class="py-3.5 px-4 font-mono text-[#A1A1AA]">
                      {formatEthiopianPhoneDisplay(item.partner_phone)}
                    </td>
                    <td class="py-3.5 px-4 text-white">
                      {item.bank_name}
                    </td>
                    <td class="py-3.5 px-4 text-[#A1A1AA]">
                      {item.account_holder}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-white">
                      {item.account_number}
                    </td>
                    <td class="py-3.5 px-4 font-mono font-bold text-white">
                      {item.amount_etb} ETB
                    </td>
                    <td class="no-print py-3.5 px-4 text-right">
                      {batch.status === 'processing' ? (
                        <form
                          action={`/admin/payouts/${batch.id}/reject-item/${item.referral_id}`}
                          method="post"
                          class="inline"
                        >
                          <button
                            type="submit"
                            title="Reject bad bank account line back to unpaid"
                            class="px-2.5 py-1 border border-[#333333] text-[#888888] hover:text-white hover:border-[#666666] text-[10px] uppercase tracking-wider rounded active:scale-95 transition-all"
                          >
                            Reject Line
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
