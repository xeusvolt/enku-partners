// Authentication & Onboarding Views — Monochrome Design
import type { FC } from 'hono/jsx';
import { BaseLayout } from './layout';

interface LoginViewProps {
  error?: string;
  message?: string;
  phone?: string;
}

export const LoginView: FC<LoginViewProps> = ({ error, message, phone = '' }) => {
  return (
    <BaseLayout title="Sign In">
      <div class="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
        <div class="text-center mb-8">
          <div class="w-12 h-12 bg-white text-black font-bold text-lg rounded-xl mx-auto flex items-center justify-center tracking-widest mb-4 shadow-lg">
            EP
          </div>
          <h1 class="text-xl font-bold tracking-tight text-white uppercase">ENKU PARTNERS</h1>
          <p class="text-xs text-[#888888] mt-1">Affiliate & Referral Network</p>
        </div>

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl">
          {message && (
            <div class="mb-5 p-3.5 rounded-xl bg-[#161616] border border-white/20 text-xs text-white">
              {message}
            </div>
          )}

          {error && (
            <div class="mb-5 p-3.5 rounded-xl bg-[#161616] border border-[#333333] text-xs text-white flex items-center space-x-2">
              <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form action="/login" method="post" class="space-y-4">
            <div>
              <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={phone}
                required
                placeholder="0911223344"
                autocomplete="tel"
                class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
              />
              <span class="text-[10px] text-[#666666] mt-1 block">Ethiopian format (09... or 07...)</span>
            </div>

            <div>
              <div class="flex justify-between items-center mb-1.5">
                <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888]">
                  Password
                </label>
                <a href="/forgot-password" class="text-[11px] text-[#888888] hover:text-white transition-colors">
                  Forgot Password?
                </a>
              </div>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                autocomplete="current-password"
                class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              class="w-full mt-2 py-3.5 px-6 whitespace-nowrap bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md"
            >
              Sign In
            </button>
          </form>

          <div class="mt-6 pt-5 border-t border-[#1C1C1C] text-center">
            <p class="text-xs text-[#888888]">
              New to Enku Partners?{' '}
              <a href="/register" class="text-white font-medium hover:underline">
                Apply as Partner
              </a>
            </p>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

interface RegisterViewProps {
  error?: string;
  formData?: {
    first_name?: string;
    father_name?: string;
    phone_number?: string;
    email?: string;
  };
}

export const RegisterView: FC<RegisterViewProps> = ({ error, formData = {} }) => {
  return (
    <BaseLayout title="Partner Registration">
      <div class="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
        <div class="text-center mb-6">
          <div class="w-12 h-12 bg-white text-black font-bold text-lg rounded-xl mx-auto flex items-center justify-center tracking-widest mb-3 shadow-lg">
            EP
          </div>
          <h1 class="text-lg font-bold tracking-tight text-white uppercase">Partner Application</h1>
          <p class="text-xs text-[#888888] mt-0.5">Join the Enku Meftihe Partner Network</p>
        </div>

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl">
          {error && (
            <div class="mb-5 p-3.5 rounded-xl bg-[#161616] border border-[#333333] text-xs text-white flex items-center space-x-2">
              <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form action="/register" method="post" class="space-y-3.5">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name || ''}
                  required
                  placeholder="Abebe"
                  class="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div>
                <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1">
                  Father's Name
                </label>
                <input
                  type="text"
                  name="father_name"
                  value={formData.father_name || ''}
                  required
                  placeholder="Kebede"
                  class="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number || ''}
                required
                placeholder="0911223344"
                class="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
              />
              <span class="text-[10px] text-[#666666] mt-0.5 block">Used for your payout verification & alerts</span>
            </div>

            <div>
              <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                placeholder="abebe@example.com"
                class="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                class="w-full px-3 py-2 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              type="submit"
              class="w-full mt-2 py-3.5 px-6 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md"
            >
              Submit Application
            </button>
          </form>

          <div class="mt-5 pt-4 border-t border-[#1C1C1C] text-center">
            <p class="text-xs text-[#888888]">
              Already registered?{' '}
              <a href="/login" class="text-white font-medium hover:underline">
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export const PendingApprovalView: FC<{ firstName?: string }> = ({ firstName = 'Partner' }) => {
  return (
    <BaseLayout title="Awaiting Admin Approval">
      <div class="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl text-center">
          <div class="w-14 h-14 rounded-full bg-[#161616] border border-[#333333] flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <span class="inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-widest bg-[#161616] text-[#A1A1AA] border border-[#262626] mb-3 font-semibold">
            Pending Review
          </span>

          <h2 class="text-lg font-bold text-white tracking-tight uppercase mb-2">
            Awaiting Admin Approval
          </h2>

          <p class="text-xs text-[#888888] leading-relaxed mb-6">
            Welcome, <strong class="text-white">{firstName}</strong>. Your partner account has been created and is currently under review by the Enku Meftihe leadership team.
          </p>

          <div class="bg-[#121212] border border-[#222222] rounded-xl p-3.5 text-left mb-6 space-y-2">
            <div class="flex items-start space-x-2 text-[11px] text-[#A1A1AA]">
              <span class="text-white font-bold">1.</span>
              <span>Our team verifies partner contact and references.</span>
            </div>
            <div class="flex items-start space-x-2 text-[11px] text-[#A1A1AA]">
              <span class="text-white font-bold">2.</span>
              <span>You will receive an instant SMS alert upon activation.</span>
            </div>
            <div class="flex items-start space-x-2 text-[11px] text-[#A1A1AA]">
              <span class="text-white font-bold">3.</span>
              <span>Once approved, you can start submitting client leads immediately.</span>
            </div>
          </div>

          <div class="space-y-2.5">
            <a
              href="/partner"
              class="block w-full py-3 px-6 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md text-center"
            >
              Check Status
            </a>
            <a
              href="/logout"
              class="block w-full py-3 px-6 border border-[#262626] text-[#888888] text-xs font-semibold uppercase tracking-wider rounded-full hover:text-white hover:border-[#444444] transition-colors text-center"
            >
              Sign Out
            </a>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export const SuspendedView: FC = () => {
  return (
    <BaseLayout title="Account Suspended">
      <div class="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8 text-center">
        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl">
          <div class="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 class="text-base font-bold text-white uppercase tracking-wider mb-2">Account Suspended</h2>
          <p class="text-xs text-[#888888] leading-relaxed mb-6">
            This account is currently restricted. Please contact Enku Meftihe executive management for assistance.
          </p>
          <a
            href="/logout"
            class="block w-full py-3 px-6 border border-[#262626] text-[#888888] text-xs font-semibold uppercase tracking-wider rounded-full hover:text-white text-center"
          >
            Sign Out
          </a>
        </div>
      </div>
    </BaseLayout>
  );
};

// ============================================================
// Forgot Password View
// ============================================================

interface ForgotPasswordViewProps {
  error?: string;
  message?: string;
  phone?: string;
}

export const ForgotPasswordView: FC<ForgotPasswordViewProps> = ({ error, message, phone = '' }) => {
  return (
    <BaseLayout title="Reset Password">
      <div class="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
        <div class="text-center mb-8">
          <div class="w-12 h-12 bg-white text-black font-bold text-lg rounded-xl mx-auto flex items-center justify-center tracking-widest mb-4 shadow-lg">
            EP
          </div>
          <h1 class="text-xl font-bold tracking-tight text-white uppercase">Reset Password</h1>
          <p class="text-xs text-[#888888] mt-1">Admin-Gated Security Verification</p>
        </div>

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl">
          {error && (
            <div class="mb-5 p-3.5 rounded-xl bg-[#161616] border border-[#333333] text-xs text-white flex items-center space-x-2">
              <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {message ? (
            <div class="space-y-4">
              <div class="p-4 rounded-xl bg-[#121212] border border-white/20 text-xs text-white space-y-2">
                <p class="font-semibold uppercase tracking-wider text-[11px] text-[#A1A1AA]">Request Submitted</p>
                <p class="text-[#CCCCCC] leading-relaxed">{message}</p>
              </div>
              <a
                href="/login"
                class="block w-full py-3.5 px-6 whitespace-nowrap bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all text-center shadow-md"
              >
                Return to Sign In
              </a>
            </div>
          ) : (
            <form action="/forgot-password" method="post" class="space-y-4">
              <p class="text-xs text-[#888888] leading-relaxed">
                Enter your registered Ethiopian phone number. Once verified and approved by management, a secure one-time reset link will be sent to your phone via SMS.
              </p>

              <div>
                <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={phone}
                  required
                  placeholder="0911223344"
                  autocomplete="tel"
                  class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
                />
                <span class="text-[10px] text-[#666666] mt-1 block">Ethiopian format (09... or 07...)</span>
              </div>

              <button
                type="submit"
                class="w-full mt-2 py-3.5 px-6 whitespace-nowrap bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md"
              >
                Request Password Reset
              </button>

              <div class="pt-3 text-center">
                <a href="/login" class="text-xs text-[#888888] hover:text-white transition-colors">
                  ← Back to Sign In
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};

// ============================================================
// Reset Password View (Enter New Password)
// ============================================================

interface ResetPasswordViewProps {
  token: string;
  isValid: boolean;
  error?: string;
}

export const ResetPasswordView: FC<ResetPasswordViewProps> = ({ token, isValid, error }) => {
  return (
    <BaseLayout title="Set New Password">
      <div class="min-h-[85vh] flex flex-col justify-center max-w-sm mx-auto px-4 py-8">
        <div class="text-center mb-8">
          <div class="w-12 h-12 bg-white text-black font-bold text-lg rounded-xl mx-auto flex items-center justify-center tracking-widest mb-4 shadow-lg">
            EP
          </div>
          <h1 class="text-xl font-bold tracking-tight text-white uppercase">Set New Password</h1>
          <p class="text-xs text-[#888888] mt-1">Enku Partners Account Security</p>
        </div>

        <div class="bg-[#0A0A0A] border border-[#262626] rounded-2xl p-6 shadow-2xl">
          {!isValid ? (
            <div class="space-y-4 text-center">
              <div class="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#333333] flex items-center justify-center mx-auto">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 class="text-sm font-bold text-white uppercase tracking-wider">Invalid or Expired Link</h2>
              <p class="text-xs text-[#888888] leading-relaxed">
                {error || 'This password reset link is invalid, has expired (1 hour limit), or has already been used.'}
              </p>
              <div class="pt-2 space-y-2">
                <a
                  href="/forgot-password"
                  class="block w-full py-3.5 px-6 whitespace-nowrap bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md"
                >
                  Request New Reset Link
                </a>
                <a
                  href="/login"
                  class="block w-full py-2.5 px-6 border border-[#262626] text-xs font-semibold text-[#888888] hover:text-white rounded-full uppercase tracking-wider transition-colors"
                >
                  Back to Sign In
                </a>
              </div>
            </div>
          ) : (
            <div>
              {error && (
                <div class="mb-5 p-3.5 rounded-xl bg-[#161616] border border-red-500/40 text-xs text-white flex items-center space-x-2">
                  <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form action="/reset" method="post" class="space-y-4">
                <input type="hidden" name="token" value={token} />

                <div>
                  <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minlength={8}
                    placeholder="At least 8 characters"
                    class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label class="block text-[11px] font-medium uppercase tracking-wider text-[#888888] mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    minlength={8}
                    placeholder="Repeat new password"
                    class="w-full px-3.5 py-2.5 bg-[#121212] border border-[#262626] rounded-xl text-sm text-white placeholder-[#555555] focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  class="w-full mt-2 py-3.5 px-6 whitespace-nowrap bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#EAEAEA] active:scale-[0.98] transition-all shadow-md"
                >
                  Save New Password
                </button>

                <div class="pt-3 text-center">
                  <a href="/login" class="text-xs text-[#888888] hover:text-white transition-colors">
                    Cancel & Return to Sign In
                  </a>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};
