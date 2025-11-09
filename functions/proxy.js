export async function onRequest(context) {
  const { request, env } = context;
  const urlObj = new URL(request.url);
  const key = urlObj.searchParams.get("key");
  const target = urlObj.searchParams.get("url");
  const SECRET = env.SECRET_KEY;

  // 1. 验证密钥
  if (key !== SECRET) {
    return new Response("Unauthorized: invalid key", { status: 401 });
  }

  // 2. 验证目标 URL
  if (!target || !(target.startsWith("http://") || target.startsWith("https://"))) {
    return new Response("Bad Request: invalid or missing url parameter", { status: 400 });
  }

  try {
    // 3. 构造发往源站的请求
    const originRequestHeaders = new Headers();
    originRequestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36");
    originRequestHeaders.set("Accept", "*/*");
    originRequestHeaders.set("Referer", new URL(target).origin + "/");

    // 支持 Range 请求，对大文件下载至关重要
    if (request.headers.has("range")) {
      originRequestHeaders.set("Range", request.headers.get("range"));
    }

    const originResp = await fetch(target, {
      method: request.method,
      headers: originRequestHeaders,
      redirect: 'follow' // 自动处理重定向
    });

    // 4. 处理源站的响应
    if (!originResp.ok) {
      // 如果源站返回错误，将错误信息透传给客户端
      return new Response(`Error fetching target: ${originResp.status} ${originResp.statusText}`, {
        status: originResp.status,
        statusText: originResp.statusText,
      });
    }

    // 5. 构造返回给客户端的响应
    const clientResponseHeaders = new Headers();
    // 保留关键的响应头
    if (originResp.headers.has("Content-Type")) clientResponseHeaders.set("Content-Type", originResp.headers.get("Content-Type"));
    if (originResp.headers.has("Content-Length")) clientResponseHeaders.set("Content-Length", originResp.headers.get("Content-Length"));
    if (originResp.headers.has("Content-Range")) clientResponseHeaders.set("Content-Range", originResp.headers.get("Content-Range"));
    
    // 添加我们自己的头
    clientResponseHeaders.set("Access-Control-Allow-Origin", "*");
    clientResponseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    clientResponseHeaders.set("Access-Control-Allow-Headers", "*");
    clientResponseHeaders.set("X-Proxy-Powered-By", "Cline");

    // 返回流式响应
    return new Response(originResp.body, {
      status: originResp.status,
      statusText: originResp.statusText,
      headers: clientResponseHeaders,
    });

  } catch (err) {
    return new Response(`Internal proxy error: ${err.message}`, { status: 500 });
  }
}
