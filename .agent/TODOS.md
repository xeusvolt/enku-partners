# ENKU PARTNERS — PHASE 1 EXECUTION TRACKER

## Overview
- **Target URL**: `partners.enkumeftihe.com`
- **Host**: Cloudflare Pages / Workers
- **Database**: Cloudflare D1 (`enku-partners-db`)
- **Repository**: `xeusvolt/enku-partners`

---

## Task Checklist & Real-Time Status

- [x] **Step 1: Git & Infrastructure Provisioning**
  - [x] Local Git initialization with comprehensive `.gitignore`
  - [ ] GitHub remote repository creation (`xeusvolt/enku-partners`)
  - [ ] Cloudflare D1 database provisioning (`enku-partners-db`)
  - [ ] `wrangler.toml` setup with D1 binding `DB`
  - [x] Local `.dev.vars` with zero secrets committed

- [ ] **Step 2: Full-Stack Scaffolding**
  - [ ] Hono.js on Cloudflare Pages Functions / Workers with JSX SSR
  - [ ] Tailwind CSS configured with luxury monochrome palette (`#000000`, `#0A0A0A`, `#121212`, `#262626`)
  - [ ] PWA assets: `manifest.json`, `sw.js`, mobile viewport meta tags, iOS touch icons
  - [ ] TypeScript configuration & build scripts

- [ ] **Step 3: Database Schema & Migrations**
  - [ ] Migration 0001: Tables (`users`, `banks`, `partner_bank_details`, `partner_commission_rates`, `referrals`, `payout_batches`)
  - [ ] Migration 0002: Seed initial Ethiopian banks
  - [ ] Local D1 test execution & validation
  - [ ] Remote D1 migration application

- [ ] **Step 4: Partner Experience & State Machine**
  - [ ] Auth: Registration with Ethiopian phone normalization (`09...` / `07...`)
  - [ ] Password hashing & JWT/Session security
  - [ ] "Awaiting Admin Approval" gating state
  - [ ] Mobile UI: Fixed bottom navigation (`Dashboard`, `Add Lead`, `Earnings`, `Bank/Profile`)
  - [ ] First-login bank account prompt & setup
  - [ ] Anti-fraud lead submission (no self-referrals, no pending/approved duplicates)
  - [ ] Dashboard counters: Pending approvals, Approved & pending payment, Paid lifetime earnings
  - [ ] SMS notification integration (SMS Ethiopia API client)

- [ ] **Step 5: Admin Workspace & Payout Engine**
  - [ ] Partner review & approval/rejection interface
  - [ ] Commission Matrix configuration per partner & role type
  - [ ] Lead review & approval with immutable rate snapshotting
  - [ ] Batch payout generator by date range
  - [ ] Printable payout slip (`@media print`) & CSV download
  - [ ] Single-item rejection override within batch
  - [ ] Batch completion workflow

- [ ] **Step 6: Seeding, Verification & Deployment**
  - [ ] `scripts/seed_admin.ts` CLI root admin provisioning
  - [ ] Automated tests & type check validation
  - [ ] Remote D1 migration apply
  - [ ] Cloudflare Pages / Workers deployment
  - [ ] Custom domain mapping verification (`partners.enkumeftihe.com`)
