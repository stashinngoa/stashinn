/**
 * Pre-deploy environment variable validation script.
 *
 * Run: node scripts/check-env.mjs
 *
 * This script validates that all required environment variables are set
 * before a deployment proceeds. Used in CI/CD and local pre-deploy checks.
 */

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_CUSTOMER_URL",
  "NEXT_PUBLIC_PARTNER_URL",
  "NEXT_PUBLIC_ADMIN_URL",
];

const SERVER_REQUIRED_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
];

const OPTIONAL_VARS = [
  "NEXT_PUBLIC_RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "TURBO_TOKEN",
  "TURBO_TEAM",
];

let hasErrors = false;

console.log("🔍 Checking required environment variables...\n");

for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    console.error(`  ❌ MISSING: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${varName}`);
  }
}

console.log("\n🔒 Checking server-side required variables...\n");

for (const varName of SERVER_REQUIRED_VARS) {
  if (!process.env[varName]) {
    console.warn(`  ⚠️  MISSING (server-only): ${varName}`);
    // Not a hard error — might be running client-side only
  } else {
    console.log(`  ✅ ${varName}`);
  }
}

console.log("\n📋 Checking optional variables...\n");

for (const varName of OPTIONAL_VARS) {
  if (!process.env[varName]) {
    console.log(`  ⏭️  NOT SET (optional): ${varName}`);
  } else {
    console.log(`  ✅ ${varName}`);
  }
}

console.log("");

if (hasErrors) {
  console.error("❌ Pre-deploy check FAILED. Missing required variables above.");
  console.error("   Copy .env.example to .env.local and fill in the values.");
  process.exit(1);
} else {
  console.log("✅ All required environment variables are set!");
}
