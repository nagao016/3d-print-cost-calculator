function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.PRO_ACCESS) return json({ active: false, error: "設定未完了です。" }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ active: false }, 400); }
  const token = body && body.licenseToken;
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    return json({ active: false });
  }

  const stored = await env.PRO_ACCESS.get(`license:${token}`, "json");
  return json({ active: stored?.status === "active" });
}
