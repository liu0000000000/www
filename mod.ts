addEventListener("fetch", (event) => {
  event.respondWith(
    new Response("Hello, Deno Deploy!", {
      headers: { "Content-Type": "text/plain" },
    })
  );
});
