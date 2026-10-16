function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID || !env.SITE_URL || !env.PRO_ACCESS) {
    return json({ error: "Pro決済の設定が完了していません。" }, 503);
  }

  const origin = request.headers.get("Origin");
  const site = new URL(env.SITE_URL).origin;
  if (origin && origin !== site) return json({ error: "許可されていないアクセスです。" }, 403);

  const token = randomToken();
  const form = new URLSearchParams({
    mode: "subscription",
    // Keep the first release on card payments. This avoids enabling delayed
    // payment methods that the current completion flow (payment_status=paid)
    // does not handle asynchronously.
    "payment_method_types[0]": "card",
    "line_items[0][price]": env.STRIPE_PRICE_ID,
    "line_items[0][quantity]": "1",
    client_reference_id: token,
    "metadata[license_token]": token,
    "subscription_data[metadata][license_token]": token,
    success_url: `${site}/?pro=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/?pro=cancelled`
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: form
  });
  const session = await response.json();
  if (!response.ok || !session.url) {
    return json({ error: "決済ページを作成できませんでした。" }, 502);
  }

  await env.PRO_ACCESS.put(`license:${token}`, JSON.stringify({ status: "pending", createdAt: Date.now() }), {
    expirationTtl: 60 * 60 * 24 * 3
  });
  return json({ url: session.url });
}
