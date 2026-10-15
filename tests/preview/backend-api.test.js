import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { onRequestPost as verifyPro } from "../../functions/api/verify-pro.js";
import { onRequestPost as stripeWebhook } from "../../functions/api/stripe-webhook.js";
import { onRequestGet as completeCheckout } from "../../functions/api/complete-checkout.js";
import { onRequestPost as createCheckout } from "../../functions/api/create-checkout-session.js";
import { onRequestPost as createPortal } from "../../functions/api/create-customer-portal.js";

function makeKV(seed = {}) {
  const store = new Map(Object.entries(seed));
  return {
    async get(key, type) {
      const value = store.get(key);
      if (value === undefined) return null;
      return type === "json" ? (typeof value === "string" ? JSON.parse(value) : value) : value;
    },
    async put(key, value) { store.set(key, value); }
  };
}
function req(body, headers = {}) {
  return new Request("https://example.test/api", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
}
function signature(raw, secret) {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex")}`;
}

test("verify-pro grants access only to an active stored token", async () => {
  const token = randomBytes(32).toString("base64url");
  const env = { PRO_ACCESS: makeKV({ [`license:${token}`]: JSON.stringify({ status: "active" }) }) };
  assert.deepEqual(await (await verifyPro({ request: req({ licenseToken: token }), env })).json(), { active: true });
  assert.deepEqual(await (await verifyPro({ request: req({ licenseToken: "invalid" }), env })).json(), { active: false });
  assert.deepEqual(await (await verifyPro({ request: req({ licenseToken: randomBytes(32).toString("base64url") }), env })).json(), { active: false });
});

test("verify-pro fails closed when KV is not configured", async () => {
  const response = await verifyPro({ request: req({}), env: {} });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).active, false);
});

test("webhook rejects missing and invalid signatures", async () => {
  const env = { STRIPE_WEBHOOK_SECRET: "whsec_test", STRIPE_SECRET_KEY: "sk_test", PRO_ACCESS: makeKV() };
  const raw = JSON.stringify({ id: "evt_bad", type: "customer.subscription.deleted", data: { object: { id: "sub_1" } } });
  assert.equal((await stripeWebhook({ request: req(raw), env })).status, 400);
  assert.equal((await stripeWebhook({ request: req(raw, { "Stripe-Signature": "t=1,v1=bad" }), env })).status, 400);
});

test("webhook revokes an issued license after Stripe confirms cancellation", async () => {
  const secret = "whsec_unit_test", token = randomBytes(32).toString("base64url");
  const kv = makeKV({ [`license:${token}`]: JSON.stringify({ status: "active", customerId: "cus_1" }) });
  const env = { STRIPE_WEBHOOK_SECRET: secret, STRIPE_SECRET_KEY: "sk_test", PRO_ACCESS: kv };
  const raw = JSON.stringify({ id: "evt_cancel_1", type: "customer.subscription.deleted", data: { object: { id: "sub_1", metadata: { license_token: token } } } });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "sub_1", status: "canceled", customer: "cus_1", metadata: { license_token: token } }), { status: 200 });
  try {
    const response = await stripeWebhook({ request: req(raw, { "Stripe-Signature": signature(raw, secret) }), env });
    assert.equal(response.status, 200);
    assert.equal((await kv.get(`license:${token}`, "json")).status, "inactive");
  } finally { globalThis.fetch = originalFetch; }
});


test("out-of-order subscription event uses Stripe's current state, not the stale event snapshot", async () => {
  const secret = "whsec_unit_test", token = randomBytes(32).toString("base64url");
  const kv = makeKV({ [`license:${token}`]: JSON.stringify({ status: "active" }) });
  const env = { STRIPE_WEBHOOK_SECRET: secret, STRIPE_SECRET_KEY: "sk_test", PRO_ACCESS: kv };
  // This older event says active, but Stripe's current subscription state is canceled.
  const raw = JSON.stringify({ id: "evt_stale_update", type: "customer.subscription.updated", data: { object: { id: "sub_1", status: "active", metadata: { license_token: token } } } });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ id: "sub_1", status: "canceled", metadata: { license_token: token } }), { status: 200 });
  try {
    const response = await stripeWebhook({ request: req(raw, { "Stripe-Signature": signature(raw, secret) }), env });
    assert.equal(response.status, 200);
    assert.equal((await kv.get(`license:${token}`, "json")).status, "inactive");
  } finally { globalThis.fetch = originalFetch; }
});


test("checkout completion activates only a paid session with matching issued token", async () => {
  const token = randomBytes(32).toString("base64url");
  const kv = makeKV({ [`license:${token}`]: JSON.stringify({ status: "pending" }) });
  const env = { STRIPE_SECRET_KEY: "sk_test", PRO_ACCESS: kv };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    status: "complete", payment_status: "paid", client_reference_id: token, customer: "cus_1",
    subscription: { id: "sub_1", status: "active", customer: "cus_1", metadata: { license_token: token }, current_period_end: 1790000000 }
  }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const response = await completeCheckout({ request: new Request(`https://example.test/api/complete-checkout?session_id=cs_test_abc123`), env });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { licenseToken: token, status: "active" });
    assert.equal((await kv.get(`license:${token}`, "json")).status, "active");
  } finally { globalThis.fetch = originalFetch; }
});

test("checkout completion rejects unpaid sessions without granting access", async () => {
  const token = randomBytes(32).toString("base64url");
  const kv = makeKV({ [`license:${token}`]: JSON.stringify({ status: "pending" }) });
  const env = { STRIPE_SECRET_KEY: "sk_test", PRO_ACCESS: kv };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    status: "complete", payment_status: "unpaid", client_reference_id: token,
    subscription: { id: "sub_1", status: "active", metadata: { license_token: token } }
  }), { status: 200 });
  try {
    const response = await completeCheckout({ request: new Request("https://example.test/api/complete-checkout?session_id=cs_test_abc123"), env });
    assert.equal(response.status, 403);
    assert.equal((await kv.get(`license:${token}`, "json")).status, "pending");
  } finally { globalThis.fetch = originalFetch; }
});


test("checkout creation fails closed when Stripe configuration is missing", async () => {
  const response = await createCheckout({ request: req({}), env: { PRO_ACCESS: makeKV() } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /設定が完了していません/);
});


test("checkout creation stores a pending token and attaches it to the subscription", async () => {
  const kv = makeKV();
  const env = { STRIPE_SECRET_KEY: "sk_test", STRIPE_PRICE_ID: "price_test", SITE_URL: "https://calquro.online", PRO_ACCESS: kv };
  const originalFetch = globalThis.fetch;
  let submitted = null;
  globalThis.fetch = async (_url, options) => {
    submitted = new URLSearchParams(options.body);
    return new Response(JSON.stringify({ url: "https://checkout.stripe.test/session" }), { status: 200 });
  };
  try {
    const response = await createCheckout({
      request: req({}, { Origin: "https://calquro.online" }), env
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).url, "https://checkout.stripe.test/session");
    const token = submitted.get("client_reference_id");
    assert.match(token, /^[A-Za-z0-9_-]{40,50}$/);
    assert.equal(submitted.get("subscription_data[metadata][license_token]"), token);
    assert.equal((await kv.get(`license:${token}`, "json")).status, "pending");
  } finally { globalThis.fetch = originalFetch; }
});

test("checkout creation rejects a foreign Origin before calling Stripe", async () => {
  const env = { STRIPE_SECRET_KEY: "sk_test", STRIPE_PRICE_ID: "price_test", SITE_URL: "https://calquro.online", PRO_ACCESS: makeKV() };
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("Stripe must not be called"); };
  try {
    const response = await createCheckout({
      request: req({}, { Origin: "https://attacker.example" }), env
    });
    assert.equal(response.status, 403);
    assert.equal(called, false);
  } finally { globalThis.fetch = originalFetch; }
});

test("customer portal rejects malformed and unknown license tokens", async () => {
  const env = { STRIPE_SECRET_KEY: "sk_test", SITE_URL: "https://calquro.online", PRO_ACCESS: makeKV() };
  const malformed = await createPortal({ request: req({ licenseToken: "bad" }), env });
  assert.equal(malformed.status, 400);
  const unknownToken = randomBytes(32).toString("base64url");
  const unknown = await createPortal({ request: req({ licenseToken: unknownToken }), env });
  assert.equal(unknown.status, 404);
});

test("webhook duplicate event ID is acknowledged without another Stripe lookup", async () => {
  const secret = "whsec_unit_test", token = randomBytes(32).toString("base64url");
  const kv = makeKV({ "stripe-event:evt_duplicate": "1" });
  const env = { STRIPE_WEBHOOK_SECRET: secret, STRIPE_SECRET_KEY: "sk_test", PRO_ACCESS: kv };
  const raw = JSON.stringify({ id: "evt_duplicate", type: "customer.subscription.updated", data: { object: { id: "sub_1", metadata: { license_token: token } } } });
  const response = await stripeWebhook({ request: req(raw, { "Stripe-Signature": signature(raw, secret) }), env });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, duplicate: true });
});
