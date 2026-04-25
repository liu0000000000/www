// 简单的Deno Deploy测试
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  if (url.pathname === "/") {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <body>
        <h1>Test Deploy</h1>
        <p>Deploy successful!</p>
        <p><a href="/test">Test API</a></p>
      </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" },
    });
  }
  
  if (url.pathname === "/test") {
    return new Response(JSON.stringify({ message: "API works!", timestamp: Date.now() }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  
  return new Response("Not Found", { status: 404 });
}
