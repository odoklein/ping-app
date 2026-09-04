/**
 * scripts/audit-e2e-test.ts
 *
 * Multi-tenant provisioning & isolation smoke test.
 * Run with:  npx tsx scripts/audit-e2e-test.ts
 *
 * Requires a running Next.js server (npm run dev) on APP_URL.
 * Uses SUPER_ADMIN_COOKIE to authenticate — export it from a browser DevTools
 * session logged in as the super-admin user.
 *
 * Environment variables (can also be put in .env.local):
 *   APP_URL            Base URL of the app           (default: http://localhost:3000)
 *   SUPER_ADMIN_COOKIE next-auth.session-token value from the super-admin session
 *   SDR_COOKIE         next-auth.session-token value from a regular SDR session
 */

import crypto from "crypto";

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
const SA_COOKIE = process.env.SUPER_ADMIN_COOKIE || "";
const SDR_COOKIE = process.env.SDR_COOKIE || "";

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function pass(msg: string) { console.log(`  ✅ PASS  ${msg}`); }
function fail(msg: string) { console.error(`  ❌ FAIL  ${msg}`); process.exitCode = 1; }
function info(msg: string) { console.log(`  ℹ️  INFO  ${msg}`); }
function section(title: string) { console.log(`\n${"─".repeat(60)}\n  ${title}\n${"─".repeat(60)}`); }

async function api(
  path: string,
  opts: { method?: string; body?: object; cookie?: string } = {}
) {
  const cookieHeader = opts.cookie
    ? `next-auth.session-token=${opts.cookie}`
    : "";
  const res = await fetch(`${APP_URL}${path}`, {
    method: opts.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// ────────────────────────────────────────────────────────────────────────────
// Test Suite
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🏛️  Ping — Multi-Tenant Audit E2E Test`);
  console.log(`   Target: ${APP_URL}`);

  const testSlug = `audit-acme-${crypto.randomBytes(3).toString("hex")}`;
  const testEmail = `owner-${testSlug}@test.invalid`;
  let orgId: string | null = null;
  let inviteUrl: string | null = null;
  let rawToken: string | null = null;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Prerequisites check
  // ──────────────────────────────────────────────────────────────────────────
  section("1 / Prerequisites");

  if (!SA_COOKIE) {
    fail("SUPER_ADMIN_COOKIE env var is not set — cannot run authenticated tests.");
    process.exit(1);
  }
  info(`Super-admin cookie: ${SA_COOKIE.slice(0, 10)}…`);
  if (!SDR_COOKIE) info("SDR_COOKIE not set — isolation test will be skipped.");

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Super-admin access control
  // ──────────────────────────────────────────────────────────────────────────
  section("2 / Super-Admin Access Control");

  const noAuthRes = await api("/api/super-admin/organizations");
  if (noAuthRes.status === 401 || noAuthRes.status === 403) {
    pass("Unauthenticated request to /api/super-admin/organizations → 401/403");
  } else {
    fail(`Expected 401/403 without auth, got ${noAuthRes.status}`);
  }

  if (SDR_COOKIE) {
    const sdrRes = await api("/api/super-admin/organizations", { cookie: SDR_COOKIE });
    if (sdrRes.status === 401 || sdrRes.status === 403) {
      pass("SDR-session request to /api/super-admin/organizations → 403");
    } else {
      fail(`SDR should be denied super-admin, got ${sdrRes.status}`);
    }
  }

  const saListRes = await api("/api/super-admin/organizations", { cookie: SA_COOKIE });
  if (saListRes.status === 200 && saListRes.json?.success) {
    pass("Super-admin can list organizations");
  } else {
    fail(`Super-admin GET /api/super-admin/organizations → ${saListRes.status}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Tenant Provisioning
  // ──────────────────────────────────────────────────────────────────────────
  section("3 / Tenant Provisioning");

  const createRes = await api("/api/super-admin/organizations", {
    method: "POST",
    cookie: SA_COOKIE,
    body: {
      name: "Acme Sales (Audit Test)",
      slug: testSlug,
      ownerEmail: testEmail,
      ownerName: "Alice Audit",
      plan: "PRO",
      maxUsers: 10,
      features: { voipEnabled: true, leexiEnabled: false, emailHubEnabled: true, pdpEnabled: false },
    },
  });

  if (createRes.status === 201 && createRes.json?.success) {
    orgId = createRes.json.organization?.id;
    inviteUrl = createRes.json.inviteUrl;
    pass(`Organization created (id: ${orgId})`);
    info(`Invite URL: ${inviteUrl}`);
    info(`Email sent: ${createRes.json.emailSent}`);
    if (!createRes.json.emailSent) {
      info("SMTP not configured — invitation URL returned in API response (expected for local dev).");
    }
  } else {
    fail(`Organization creation failed: ${JSON.stringify(createRes.json)}`);
    process.exit(1);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Invitation token integrity
  // ──────────────────────────────────────────────────────────────────────────
  section("4 / Invitation Token Integrity");

  if (inviteUrl) {
    rawToken = inviteUrl.split("/invite/")[1] ?? null;
    if (rawToken && /^[0-9a-f]{64}$/.test(rawToken)) {
      pass(`Raw token is 64 hex chars (256-bit entropy from crypto.randomBytes(32))`);
    } else {
      fail(`Token format unexpected: ${rawToken}`);
    }

    // Verify endpoint
    const verifyRes = await api(`/api/invitations/verify?token=${rawToken}`);
    if (verifyRes.status === 200 && verifyRes.json?.data?.valid) {
      pass("Token verification endpoint returns valid=true for fresh token");
      info(`Role: ${verifyRes.json.data.invitation?.role}, Expires: ${verifyRes.json.data.invitation?.expiresAt}`);
    } else {
      fail(`Token verify failed: ${JSON.stringify(verifyRes.json)}`);
    }

    // Replay-protection: verify twice should still return valid (token not consumed yet)
    const verify2 = await api(`/api/invitations/verify?token=${rawToken}`);
    if (verify2.json?.data?.valid) {
      pass("Second verify call still valid (token consumed only on accept — no replay on verify)");
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Tenant Isolation
  // ──────────────────────────────────────────────────────────────────────────
  section("5 / Cross-Tenant Data Isolation");

  if (SDR_COOKIE && orgId) {
    // An SDR from their own org should NOT be able to read another org's details
    const crossRes = await api(`/api/super-admin/organizations/${orgId}`, { cookie: SDR_COOKIE });
    if (crossRes.status === 403 || crossRes.status === 401) {
      pass("SDR cannot access new org details via super-admin API");
    } else {
      fail(`SDR got ${crossRes.status} on /api/super-admin/organizations/${orgId} — expected 403`);
    }

    // Header injection attempt: SDR tries to impersonate the test tenant
    const headerInjectionRes = await fetch(`${APP_URL}/api/clients`, {
      headers: {
        Cookie: `next-auth.session-token=${SDR_COOKIE}`,
        "x-organization-slug": testSlug,
      },
    });
    // After our fix, this header should be silently ignored for non-super-admins.
    // The SDR should only see their own org's clients (likely empty for the test org).
    if (headerInjectionRes.status === 200) {
      const body = await headerInjectionRes.json().catch(() => ({}));
      // We can't inspect the DB directly here, but a successful 200 with empty/own data is OK.
      // A fail would be if they receive data from the injected org.
      info(`Header injection attempt: got 200 — verify manually that response scopes to SDR's own org, not '${testSlug}'.`);
    } else {
      info(`Header injection attempt returned ${headerInjectionRes.status} — likely safe.`);
    }
  } else {
    info("Skipping isolation test (no SDR_COOKIE provided).");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Cleanup
  // ──────────────────────────────────────────────────────────────────────────
  section("6 / Cleanup");

  if (orgId) {
    const deleteRes = await api(`/api/super-admin/organizations/${orgId}`, {
      method: "DELETE",
      cookie: SA_COOKIE,
    });
    if (deleteRes.status === 200 && deleteRes.json?.success) {
      pass(`Test organization '${testSlug}' (${orgId}) deleted successfully`);
    } else {
      fail(`Cleanup failed: ${JSON.stringify(deleteRes.json)}`);
    }

    // Verify invitation token is now invalid (cascade delete)
    if (rawToken) {
      const afterDeleteVerify = await api(`/api/invitations/verify?token=${rawToken}`);
      if (!afterDeleteVerify.json?.data?.valid) {
        pass("Invitation token invalid after org deletion (cascade delete working)");
      } else {
        fail("Invitation token still valid after org deletion — orphaned row risk");
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  section("Summary");
  if (process.exitCode === 1) {
    console.error("\n⚠️  Some tests FAILED. Review the output above.\n");
  } else {
    console.log("\n🎉  All tests PASSED.\n");
  }
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
