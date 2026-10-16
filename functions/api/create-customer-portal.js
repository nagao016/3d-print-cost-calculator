function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY || !env.SITE_URL || !env.PRO_ACCESS) {
    return json({ error: "Pro決済の設定が完了していません。" }, 503);
  }
  const origin = request.headers.get("Origin");
  const requestUrl = new URL(request.url);
  const configuredSite = new URL(env.SITE_URL).origin;
  // Allow same-origin Cloudflare Pages preview testing without weakening production origin checks.
  const isPagesDevHost = requestUrl.hostname.endsWith(".pages.dev");
  const site = isPagesDevHost ? requestUrl.origin : configuredSite;
  if (origin && origin !== site) return json({ error: "許可されていないアクセスです。" }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: "入力を確認してください。" }, 400); }
  const token = body?.licenseToken;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    return json({ error: "会員情報を確認できません。" }, 400);
  }

  const license = await env.PRO_ACCESS.get(`license:${token}`, "json");
  if (!license?.customerId) return json({ error: "決済管理情報が見つかりません。" }, 404);

  const form = new URLSearchParams({
    customer: license.customerId,
    return_url: site + "/"
  });
  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded"
    },
    body: form
  });
  const session = await response.json();
  if (!response.ok || !session.url) return json({ error: "契約管理ページを作成できませんでした。" }, 502);
  return json({ url: session.url });
}
