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
  return signatures.some(signature => safeEqual(expected, signature));
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.PRO_ACCESS) return json({ error: "設定未完了です。" }, 503);
  const rawBody = await request.text();
  const valid = await verifySignature(rawBody, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: "署名が無効です。" }, 400);

  let event;
  try { event = JSON.parse(rawBody); } catch { return json({ error: "JSONが無効です。" }, 400); }
  const object = event.data?.object;
  let token = object?.metadata?.license_token;

  if (event.type === "checkout.session.completed") {
    token = object?.client_reference_id || token;
  }
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return json({ received: true });

  if (event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted") {
    const active = ["active", "trialing"].includes(object.status);
    if (active) {
      const existing = await env.PRO_ACCESS.get(`license:${token}`, "json") || {};
      await env.PRO_ACCESS.put(`license:${token}`, JSON.stringify({
        ...existing,
        status: "active",
        customerId: object.customer || existing.customerId || null,
        subscriptionId: object.id || existing.subscriptionId || null,
        currentPeriodEnd: object.current_period_end || null
      }));
    } else {
      const existing = await env.PRO_ACCESS.get(`license:${token}`, "json") || {};
      await env.PRO_ACCESS.put(`license:${token}`, JSON.stringify({
        ...existing,
        status: "inactive",
        customerId: object.customer || existing.customerId || null,
        subscriptionId: object.id || existing.subscriptionId || null,
        currentPeriodEnd: object.current_period_end || null
      }));
    }
  }
  return json({ received: true });
}
