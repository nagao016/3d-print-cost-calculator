function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const fields = signatureHeader.split(",").map(part => {
    const [key, value] = part.split("=", 2);
    return [key, value];
  });
  const timestamp = fields.find(([key]) => key === "t")?.[1];
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || signatures.length === 0) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;
  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expected = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return signatures.some(signature => typeof signature === "string" && safeEqual(expected, signature));
}

function idOf(value) {
  if (typeof value === "string") return value;
  return value && typeof value.id === "string" ? value.id : null;
}

async function retrieveSubscription(subscriptionId, secret) {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { authorization: `Bearer ${secret}` }
  });
  const subscription = await response.json();
  if (!response.ok || !subscription.id) throw new Error("Stripe subscription lookup failed");
  return subscription;
}

export async function onRequestPost({ request, env }) {
  const webhookSecrets = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_WEBHOOK_SECRET_PREVIEW_FIX]
    .filter(secret => typeof secret === "string" && secret.length > 0);
  if (webhookSecrets.length === 0 || !env.STRIPE_SECRET_KEY || !env.PRO_ACCESS) {
    return json({ error: "設定未完了です。" }, 503);
  }
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("Stripe-Signature");
  let valid = false;
  for (const secret of webhookSecrets) {
    if (await verifySignature(rawBody, signatureHeader, secret)) {
      valid = true;
      break;
    }
  }
  if (!valid) return json({ error: "署名が無効です。" }, 400);

  let event;
  try { event = JSON.parse(rawBody); } catch { return json({ error: "JSONが無効です。" }, 400); }
  if (!event.id || typeof event.id !== "string") return json({ error: "イベントIDがありません。" }, 400);

  // Stripe retries use the same event ID. KV deduplication is best-effort; updates below
  // are also based on Stripe's current subscription state, so retries remain safe.
  const processedKey = `stripe-event:${event.id}`;
  if (await env.PRO_ACCESS.get(processedKey)) return json({ received: true, duplicate: true });

  const object = event.data?.object;
  let subscriptionId = null;
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    subscriptionId = idOf(object);
  } else if (event.type === "invoice.payment_failed") {
    // Stripe API versions differ in how the invoice's subscription reference is represented.
    subscriptionId = idOf(object?.subscription) ||
      idOf(object?.parent?.subscription_details?.subscription);
  } else if (event.type !== "checkout.session.completed") {
    await env.PRO_ACCESS.put(processedKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    // Checkout completion alone does not grant access; /api/complete-checkout validates
    // the paid session and the previously issued pending token.
    await env.PRO_ACCESS.put(processedKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ received: true });
  }

  if (!subscriptionId) {
    // A payment-failed invoice without a subscription is not a subscription entitlement event.
    await env.PRO_ACCESS.put(processedKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ received: true });
  }

  let subscription;
  try {
    // Do not trust the event snapshot for entitlement state: an older event may arrive late.
    subscription = await retrieveSubscription(subscriptionId, env.STRIPE_SECRET_KEY);
  } catch {
    return json({ error: "契約状態をStripeで確認できませんでした。" }, 502);
  }

  const token = subscription.metadata?.license_token || object?.metadata?.license_token;
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    await env.PRO_ACCESS.put(processedKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ received: true });
  }

  const licenseKey = `license:${token}`;
  const existing = await env.PRO_ACCESS.get(licenseKey, "json");
  // Do not create entitlements from arbitrary metadata: this app must have issued the token.
  if (!existing || !["pending", "active", "inactive"].includes(existing.status)) {
    await env.PRO_ACCESS.put(processedKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return json({ received: true });
  }

  const active = ["active", "trialing"].includes(subscription.status);
  await env.PRO_ACCESS.put(licenseKey, JSON.stringify({
    ...existing,
    status: active ? "active" : "inactive",
    customerId: idOf(subscription.customer) || existing.customerId || null,
    subscriptionId: subscription.id || existing.subscriptionId || null,
    currentPeriodEnd: subscription.current_period_end || null
  }));
  await env.PRO_ACCESS.put(processedKey, "1", { expirationTtl: 60 * 60 * 24 * 30 });
  return json({ received: true });
}
