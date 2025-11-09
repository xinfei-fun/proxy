export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const urlObj = new URL(request.url);
  const key = urlObj.searchParams.get("key");
  const target = urlObj.searchParams.get("url");
  const SECRET = env.SECRET_KEY;  // 环境变量配置的密码

  if (key !== SECRET) {
    return new Response("Unauthorized: invalid key", { status: 401 });
  }
  if (!target || !(target.startsWith("http://") || target.startsWith("https://"))) {
    return new Response("Bad Request: invalid or missing url parameter", { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(target, request);
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  const originResp = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });

  if (!originResp.ok) {
    return new Response(`Error fetching target: ${originResp.status}`, { status: 502 });
  }

  const resp = new Response(originResp.body, originResp);
  resp.headers.set("Cache‑Control", "public, s‑maxage=86400");
  resp.headers.set("Access‑Control‑Allow‑Origin", "*");
  resp.headers.set("Access‑Control‑Allow-Headers", "*");
  // 若需强制下载可加：
  // resp.headers.set("Content‑Disposition", "attachment; filename=\"download\"");

  waitUntil(cache.put(cacheKey, resp.clone()));
  return resp;
}
