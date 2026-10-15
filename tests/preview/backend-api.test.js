import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { onRequestPost as verifyPro } from "../../functions/api/verify-pro.js";
import { onRequestPost as stripeWebhook } from "../../functions/api/stripe-webhook.js";

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

test("webhook duplicate event ID is acknowledged without another Stripe lookup", async () => {
  const secret = "whsec_unit_test", token = randomBytes(32).toString("base64url");
  const kv = makeKV({ "stripe-event:evt_duplicate": "1" });
  const env = { STRIPE_WEBHOOK_SECRET: secret, STRIPE_SECRET_KEY: "sk_test", PRO_ACCESS: kv };
  const raw = JSON.stringify({ id: "evt_duplicate", type: "customer.subscription.updated", data: { object: { id: "sub_1", metadata: { license_token: token } } } });
  const response = await stripeWebhook({ request: req(raw, { "Stripe-Signature": signature(raw, secret) }), env });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, duplicate: true });
});
