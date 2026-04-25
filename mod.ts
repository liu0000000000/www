import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const X_DOMAIN = Deno.env.get("X_DOMAIN") || "x.com";
const PORT = parseInt(Deno.env.get("PORT") || "8080");

const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = new URL(url.pathname + url.search, `https://${X_DOMAIN}`);

  try {
    const headers = new Headers(req.headers);
    headers.set("Host", X_DOMAIN);
    headers.delete("Origin");
    headers.delete("Referer");
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

    const proxyReq = new Request(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.body,
      redirect: "follow",
      credentials: "omit",
    });

    const response = await fetch(proxyReq);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS);
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Access-Control-Max-Age", "86400");
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Content-Security-Policy");
    responseHeaders.delete("X-Frame-Options");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error: ${error.message}`);
    return new Response(JSON.stringify({ error: "Proxy request failed", message: error.message }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
      },
    });
  }
}

if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
  addEventListener("fetch", (event: FetchEvent) => {
    event.respondWith(handleRequest(event.request));
  });
} else {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log(`Proxying requests to ${X_DOMAIN}`);
  await serve(handleRequest, { port: PORT });
}
