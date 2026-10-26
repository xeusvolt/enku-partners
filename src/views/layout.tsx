// Luxury Monochrome Layout for Enku Partners
import type { FC, PropsWithChildren } from 'hono/jsx';

interface LayoutProps {
  title?: string;
  activeNav?: 'dashboard' | 'add-lead' | 'earnings' | 'profile' | 'admin-leads' | 'admin-partners' | 'admin-payouts';
  isPartner?: boolean;
  isAdmin?: boolean;
  userFirstName?: string;
}

export const BaseLayout: FC<PropsWithChildren<LayoutProps>> = ({
  children,
  title = 'Enku Partners',
  activeNav,
  isPartner = false,
  isAdmin = false,
  userFirstName
}) => {
  return (
    <html lang="en" class="h-full bg-black text-white antialiased">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <title>{title} — Enku Partners</title>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/static/icons/icon-192.svg" />
        <link rel="stylesheet" href="/static/css/styles.css" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(console.error);
              });
            }
          `
        }} />
      </head>
      <body class="h-full flex flex-col bg-[#000000] text-[#FFFFFF] select-none">
        {/* Admin Desktop Header */}
        {isAdmin && (
          <header class="no-print w-full border-b border-[#262626] bg-[#0A0A0A] sticky top-0 z-40">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div class="flex items-center space-x-6">
                <a href="/admin" class="flex items-center space-x-2 text-white font-medium tracking-tight">
                  <div class="w-7 h-7 rounded-sm bg-white text-black flex items-center justify-center font-bold text-xs tracking-widest">
                    EP
                  </div>
                  <span class="text-sm font-semibold tracking-wider">ENKU PARTNERS</span>
                  <span class="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-[#333333] text-[#888888]">Admin</span>
                </a>
                <nav class="hidden md:flex space-x-1 text-xs font-medium">
                  <a
                    href="/admin/leads"
                    class={`px-3 py-1.5 rounded transition-colors ${
                      activeNav === 'admin-leads' ? 'bg-[#1E1E1E] text-white' : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    Referrals & Leads
                  </a>
                  <a
                    href="/admin/partners"
                    class={`px-3 py-1.5 rounded transition-colors ${
                      activeNav === 'admin-partners' ? 'bg-[#1E1E1E] text-white' : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    Partners Matrix
                  </a>
                  <a
                    href="/admin/payouts"
                    class={`px-3 py-1.5 rounded transition-colors ${
                      activeNav === 'admin-payouts' ? 'bg-[#1E1E1E] text-white' : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    Batch Payouts
                  </a>
                </nav>
              </div>
              <div class="flex items-center space-x-4 text-xs">
                <span class="text-[#888888] hidden sm:inline">{userFirstName || 'Admin'}</span>
                <a
                  href="/logout"
                  class="px-2.5 py-1 rounded border border-[#262626] text-[#888888] hover:text-white hover:border-[#444444] transition-colors"
                >
                  Sign Out
                </a>
              </div>
            </div>
          </header>
        )}

        {/* Partner Mobile Header */}
        {isPartner && (
          <header class="no-print w-full border-b border-[#262626] bg-[#0A0A0A] pt-safe sticky top-0 z-40">
            <div class="px-4 h-14 flex items-center justify-between max-w-lg mx-auto">
              <div class="flex items-center space-x-2.5">
                <div class="w-6 h-6 rounded-sm bg-white text-black flex items-center justify-center font-bold text-[10px] tracking-wider">
                  EP
                </div>
                <span class="text-xs font-semibold tracking-wider text-white">ENKU PARTNERS</span>
              </div>
              <div class="flex items-center space-x-3 text-xs">
                <span class="text-[11px] text-[#888888]">{userFirstName ? `Hi, ${userFirstName}` : ''}</span>
                <a href="/logout" class="text-[11px] text-[#888888] hover:text-white transition-colors">
                  Exit
                </a>
              </div>
            </div>
          </header>
        )}

        {/* Main Content Area */}
        <main class={`flex-1 w-full ${isPartner ? 'pb-24 max-w-lg mx-auto px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'}`}>
          {children}
        </main>

        {/* Partner Native Mobile Bottom Navigation */}
        {isPartner && (
          <nav class="no-print fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-[#262626] pb-safe backdrop-blur-md">
            <div class="max-w-lg mx-auto grid grid-cols-4 h-16 text-[10px] font-medium tracking-wide">
              <a
                href="/partner"
                class={`flex flex-col items-center justify-center space-y-1 active:scale-95 transition-transform ${
                  activeNav === 'dashboard' ? 'text-white font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </a>

              <a
                href="/partner/leads/new"
                class={`flex flex-col items-center justify-center space-y-1 active:scale-95 transition-transform ${
                  activeNav === 'add-lead' ? 'text-white font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Lead</span>
              </a>

              <a
                href="/partner/earnings"
                class={`flex flex-col items-center justify-center space-y-1 active:scale-95 transition-transform ${
                  activeNav === 'earnings' ? 'text-white font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Earnings</span>
              </a>

              <a
                href="/partner/profile"
                class={`flex flex-col items-center justify-center space-y-1 active:scale-95 transition-transform ${
                  activeNav === 'profile' ? 'text-white font-semibold' : 'text-[#888888] hover:text-white'
                }`}
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Bank / Profile</span>
              </a>
            </div>
          </nav>
        )}
      </body>
    </html>
  );
};
