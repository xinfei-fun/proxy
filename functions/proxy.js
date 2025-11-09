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
    const referer = new URL(target).origin + "/";
    const originResp = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": referer,
      }
    });
    console.log("Origin response status for target:", originResp.status);

    if (!originResp.ok) {
      console.log("Error fetching target - status:", originResp.status, originResp.statusText);
      return new Response(`Error fetching target: ${originResp.status} ${originResp.statusText}`, {
        status: originResp.status,
        statusText: originResp.statusText,
      });
    }

    const newHeaders = new Headers();
    newHeaders.set("Content-Type", originResp.headers.get("Content-Type"));
    newHeaders.set("Content-Length", originResp.headers.get("Content-Length"));
    newHeaders.set("Cache-Control", "public, s-maxage=86400");
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Headers", "*");

    const resp = new Response(originResp.body, {
      status: originResp.status,
      statusText: originResp.statusText,
      headers: newHeaders,
    });

    waitUntil(cache.put(cacheKey, resp.clone()));
    console.log("Stored response in cache for target:", target);

    return resp;
  } catch (err) {
    console.log("Unexpected error in proxy:", err);
    return new Response(`Internal error: ${err.message}`, { status: 500 });
  }
}
