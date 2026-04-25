import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const X_DOMAIN = "x.com";
const PORT = 8080;

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const targetUrl = new URL(url.pathname + url.search, `https://${X_DOMAIN}`);
  
  try {
    const headers = new Headers(req.headers);
    headers.set("Host", X_DOMAIN);
    headers.delete("Origin");
    headers.delete("Referer");
    
    const proxyReq = new Request(targetUrl.toString(), {
      method: req.method,
      headers,
      body: req.body,
      redirect: "follow",
    });
    
    const response = await fetch(proxyReq);
    
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*,");
    responseHeaders.delete("Content-Security-Policy");
    responseHeaders.delete("X-Content-Security-Policy");
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Proxy error: ${error.message}`);
    return new Response(`Proxy error: ${error.message}`, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

console.log(`Proxy server running on http://localhost:${PORT}`);
console.log(`Proxying requests to ${X_DOMAIN}`);

await serve(handleRequest, { port: PORT });
