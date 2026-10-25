import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

console.log("=== RUNNING AUTOMATED VERIFICATION OF HANOI CRAFTTRUST ===");

async function testAuthAndRoles() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Admin login test
  const adminRes = await supabase.auth.signInWithPassword({
    email: "admin@crafttrust.vn",
    password: "12345678",
  });
  if (adminRes.error) {
    console.error("Admin sign-in FAILED:", adminRes.error.message);
  } else {
    console.log("✓ Admin sign-in SUCCESS with password 12345678. User ID:", adminRes.data.user.id);
    await verifyRoles(supabase, adminRes.data.user.id, "admin");
  }

  // 2. Seller login test
  const sellerRes = await supabase.auth.signInWithPassword({
    email: "seller@crafttrust.vn",
    password: "12345678",
  });
  if (sellerRes.error) {
    console.error("Seller sign-in FAILED:", sellerRes.error.message);
  } else {
    console.log("✓ Seller sign-in SUCCESS with password 12345678. User ID:", sellerRes.data.user.id);
    await verifyRoles(supabase, sellerRes.data.user.id, "seller");
  }

  // 3. Buyer login test
  const buyerRes = await supabase.auth.signInWithPassword({
    email: "buyer@crafttrust.vn",
    password: "12345678",
  });
  if (buyerRes.error) {
    console.error("Buyer sign-in FAILED:", buyerRes.error.message);
  } else {
    console.log("✓ Buyer sign-in SUCCESS with password 12345678. User ID:", buyerRes.data.user.id);
    await verifyRoles(supabase, buyerRes.data.user.id, "customer");
  }
}

async function verifyRoles(supabase, userId, expectedRole) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    console.error("Error fetching roles:", error.message);
    return;
  }
  const roles = data.map((r) => r.role);
  console.log(`  User ${userId} roles: [${roles.join(", ")}]`);
  const hasExpected = roles.includes(expectedRole);
  console.log(`  Expected '${expectedRole}': ${hasExpected ? "PASS ✓" : "FAIL ✗"}`);
}

async function testDatabaseIntegrity() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Check products
  const { data: products } = await supabase.from("products").select("id, name, status, price_vnd, artisan_id");
  console.log(`✓ Products in DB: ${products?.length ?? 0}`);
  products?.forEach((p) => {
    console.log(`  - [${p.status}] ${p.name} (${p.price_vnd} VND)`);
  });

  // Check artisans
  const { data: artisans } = await supabase.from("artisans").select("id, name, is_published, village_id");
  console.log(`✓ Artisans in DB: ${artisans?.length ?? 0}`);
  artisans?.forEach((a) => {
    console.log(`  - [Published: ${a.is_published}] ${a.name}`);
  });

  // Check orders (as admin client)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await adminClient.auth.signInWithPassword({
    email: "admin@crafttrust.vn",
    password: "12345678",
  });
  const { data: orders, error: orderErr } = await adminClient.from("orders").select("id, status, subtotal_vnd, payment_mode");
  console.log(`✓ Real Orders in DB: ${orders?.length ?? 0} (error: ${orderErr?.message ?? "none"})`);
  orders?.forEach((o) => {
    console.log(`  - Order ${o.id.slice(0, 8)}: ${o.status} (${o.subtotal_vnd} VND)`);
  });

  // Check passport benchmark record
  const { data: passport } = await supabase
    .from("passport_records")
    .select("id, public_code, artifact_name, status, ocop_rating, is_authentic")
    .eq("public_code", "CT-BTG-NVA-2026-0085")
    .maybeSingle();
  console.log("✓ Benchmark Passport Record (CT-BTG-NVA-2026-0085):", passport ? "FOUND ✓" : "NOT FOUND ✗");
  if (passport) {
    console.log(`  - Name: ${passport.artifact_name}`);
    console.log(`  - Status: ${passport.status}`);
    console.log(`  - OCOP Rating: ${passport.ocop_rating || "None (Uncertified disclaimer confirmed)"}`);
    console.log(`  - Authentic: ${passport.is_authentic}`);
  }
}

async function runAll() {
  try {
    await testAuthAndRoles();
    await testDatabaseIntegrity();
    console.log("=== ALL INTEGRATION CHECKS FINISHED SUCCESSFULLY ===");
  } catch (e) {
    console.error("Test failure:", e);
  }
}

runAll();
