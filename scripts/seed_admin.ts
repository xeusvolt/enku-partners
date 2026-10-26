// Seed Initial Root Administrator for Enku Partners
import { execSync } from 'node:child_process';
import { hashPassword } from '../src/lib/auth';
import { normalizeEthiopianPhone } from '../src/lib/phone';

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes('--remote');
  const targetFlag = isRemote ? '--remote' : '--local';

  // Read configuration or CLI inputs
  const rawPhone = process.env.ADMIN_PHONE || '0911000000';
  const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const fatherName = process.env.ADMIN_FATHER_NAME || 'Enku';
  const email = process.env.ADMIN_EMAIL || 'admin@enkumeftihe.com';
  const password = process.env.ADMIN_PASSWORD || 'EnkuAdmin@2026!';

  const phone = normalizeEthiopianPhone(rawPhone);
  if (!phone) {
    console.error(`Invalid Ethiopian phone number: ${rawPhone}`);
    process.exit(1);
  }

  console.log(`Generating secure password hash for root administrator...`);
  const passwordHash = await hashPassword(password);
  const adminId = '00000000-0000-4000-8000-000000000001';
  const now = new Date().toISOString();

  const sql = `
    INSERT INTO users (id, role, first_name, father_name, email, phone_number, password_hash, status, created_at)
    VALUES ('${adminId}', 'admin', '${firstName}', '${fatherName}', '${email}', '${phone}', '${passwordHash}', 'active', '${now}')
    ON CONFLICT(phone_number) DO UPDATE SET
      password_hash = '${passwordHash}',
      status = 'active',
      role = 'admin';
  `.trim().replace(/\n/g, ' ');

  console.log(`Executing SQL provisioning on ${isRemote ? 'REMOTE Cloudflare D1' : 'LOCAL D1 emulator'}...`);

  try {
    const output = execSync(
      `npx wrangler d1 execute enku-partners-db ${targetFlag} --command="${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8' }
    );
    console.log(output);
    console.log('\n============================================================');
    console.log('✅ Root Administrator Seeded Successfully!');
    console.log(`Target: ${isRemote ? 'Remote D1 Production' : 'Local D1 Emulator'}`);
    console.log(`Phone:  ${phone}`);
    console.log(`Email:  ${email}`);
    console.log(`Role:   admin`);
    console.log(`Status: active`);
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('Failed to seed admin:', err?.message || err);
    process.exit(1);
  }
}

main().catch(console.error);
