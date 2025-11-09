export async function onRequest(context) {
  const { request, env, waitUntil } = context;
  const urlObj = new URL(request.url);
  const key = urlObj.searchParams.get("key");
  const target = urlObj.searchParams.get("url");
  const SECRET = env.SECRET_KEY;

  console.log("Proxy request - key:", key);
  console.log("Proxy request - target:", target);

  if (key !== SECRET) {
    console.log("Unauthorized: invalid key");
    return new Response("Unauthorized: invalid key", { status: 401 });
  }
  if (!target || !(target.startsWith("http://") || target.startsWith("https://"))) {
    console.log("Bad Request: invalid or missing url parameter");
    return new Response("Bad Request: invalid or missing url parameter", { status: 400 });
  }

  try {
    const cache = caches.default;
    const cacheKey = new Request(target, request);
    let response = await cache.match(cacheKey);
    if (response) {
      console.log("Cache HIT for target:", target);
      return response;
    }

    console.log("Cache MISS for target:", target);
    const originResp = await fetch(target, {
      method: "GET",
      // 你也可以删掉 headers/body 传递，只保留必要项
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible)",
        "Accept": "*/*"
      }
    });
    console.log("Origin response status for target:", originResp.status);

    if (!originResp.ok) {
      console.log("Error fetching target - status:", originResp.status);
      return new Response(`Error fetching target: ${originResp.status}`, { status: 502 });
    }

    const resp = new Response(originResp.body, originResp);
    resp.headers.set("Cache-Control", "public, s-maxage=86400");
    resp.headers.set("Access-Control-Allow-Origin", "*");
    resp.headers.set("Access-Control-Allow-Headers", "*");

    waitUntil(cache.put(cacheKey, resp.clone()));
    console.log("Stored response in cache for target:", target);

    return resp;
  } catch (err) {
    console.log("Unexpected error in proxy:", err);
    return new Response(`Internal error: ${err.message}`, { status: 500 });
  }
}
