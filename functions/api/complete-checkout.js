function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.STRIPE_SECRET_KEY || !env.PRO_ACCESS) return json({ error: "設定未完了です。" }, 503);
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId || !/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) {
    return json({ error: "決済セッションを確認できません。" }, 400);
  }

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }
  });
  const session = await response.json();
  if (!response.ok || session.status !== "complete" || session.payment_status !== "paid") {
    return json({ error: "決済が完了していません。" }, 403);
  }

  const token = session.client_reference_id;
  if (!token || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return json({ error: "利用権限を確認できません。" }, 403);
  const subscription = session.subscription;
  const status = typeof subscription === "object" ? subscription.status : null;
  if (!["active", "trialing"].includes(status)) return json({ error: "有効な契約を確認できません。" }, 403);

  await env.PRO_ACCESS.put(`license:${token}`, JSON.stringify({
    status: "active",
    customerId: session.customer || null,
    subscriptionId: typeof subscription === "object" ? subscription.id : subscription,
    currentPeriodEnd: subscription.current_period_end || null
  }));
  return json({ licenseToken: token, status: "active" });
}
