const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";

const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>网页转MHT查看器</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a1a; color: #fff; height: 100vh; display: flex; flex-direction: column; }
    .header { background: #2d2d2d; padding: 15px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #444; }
    .logo { font-size: 18px; font-weight: bold; color: #00d4ff; }
    .address-bar { flex: 1; display: flex; align-items: center; background: #1a1a1a; border-radius: 6px; padding: 8px 12px; border: 1px solid #444; }
    .address-bar input { flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; outline: none; }
    .address-bar button { background: #00d4ff; border: none; color: #000; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; }
    .address-bar button:hover { background: #00b8e6; }
    .content { flex: 1; display: flex; overflow: hidden; }
    .sidebar { width: 200px; background: #2d2d2d; border-right: 1px solid #444; padding: 10px; overflow-y: auto; }
    .sidebar h3 { font-size: 12px; color: #888; margin-bottom: 10px; text-transform: uppercase; }
    .sidebar-item { padding: 8px 10px; margin-bottom: 4px; background: #3d3d3d; border-radius: 4px; cursor: pointer; font-size: 13px; word-break: break-all; }
    .sidebar-item:hover { background: #4d4d4d; }
    .viewer { flex: 1; padding: 20px; overflow-y: auto; }
    .viewer iframe { width: 100%; height: 100%; border: none; background: #fff; border-radius: 8px; }
    .loading, .error { display: none; text-align: center; padding: 40px; }
    .loading.show { display: block; }
    .error.show { display: block; color: #ff6b6b; }
    .spinner { width: 40px; height: 40px; border: 3px solid #444; border-top-color: #00d4ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🌐 MHT Viewer</div>
    <div class="address-bar">
      <input type="text" id="urlInput" placeholder="输入网址，例如 https://example.com" value="">
      <button onclick="fetchPage()">访问</button>
    </div>
  </div>
  <div class="content">
    <div class="sidebar">
      <h3>历史记录</h3>
      <div id="history"></div>
    </div>
    <div class="viewer">
      <div id="loading" class="loading"><div class="spinner"></div><p>正在获取网页内容...</p></div>
      <div id="error" class="error"></div>
      <iframe id="mhtViewer" sandbox="allow-same-origin"></iframe>
    </div>
  </div>
  <script>
    const PROXY_URL = window.location.origin;
    let history = JSON.parse(localStorage.getItem('mht_history') || '[]');

    function updateHistory() {
      const container = document.getElementById('history');
      container.innerHTML = history.map(url => 
        '<div class="sidebar-item" onclick="loadFromHistory(\\'' + url + '\\')">' + url + '</div>'
      ).join('');
    }

    function loadFromHistory(url) {
      document.getElementById('urlInput').value = url;
      fetchPage();
    }

    async function fetchPage() {
      const url = document.getElementById('urlInput').value.trim();
      if (!url) return;

      const loading = document.getElementById('loading');
      const error = document.getElementById('error');
      const viewer = document.getElementById('mhtViewer');

      loading.classList.add('show');
      error.classList.remove('show');
      viewer.style.display = 'none';

      try {
        const fullUrl = url.startsWith('http') ? url : 'https://' + url;
        const response = await fetch(PROXY_URL + '/fetch?url=' + encodeURIComponent(fullUrl));
        
        if (!response.ok) throw new Error('获取失败: ' + response.status);

        const mhtContent = await response.text();
        
        if (!history.includes(fullUrl)) {
          history.unshift(fullUrl);
          if (history.length > 20) history.pop();
          localStorage.setItem('mht_history', JSON.stringify(history));
          updateHistory();
        }

        const blob = new Blob([mhtContent], { type: 'message/rfc822' });
        const blobUrl = URL.createObjectURL(blob);
        viewer.onload = () => URL.revokeObjectURL(blobUrl);
        viewer.src = blobUrl;
        viewer.style.display = 'block';
      } catch (err) {
        error.textContent = err.message;
        error.classList.add('show');
      } finally {
        loading.classList.remove('show');
      }
    }

    document.getElementById('urlInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') fetchPage();
    });

    updateHistory();
  </script>
</body>
</html>`;

function generateMHT(html: string, baseUrl: string): string {
  const boundary = "----MHTBoundary" + Date.now();
  const now = new Date().toUTCString();
  
  let mht = "From: <Saved by Deno MHT Converter>\r\n";
  mht += "Subject: " + new URL(baseUrl).hostname + "\r\n";
  mht += "Date: " + now + "\r\n";
  mht += "MIME-Version: 1.0\r\n";
  mht += "Content-Type: multipart/related;\r\n";
  mht += ' boundary="' + boundary + '"\r\n';
  mht += "X-Generated-By: Deno MHT Converter\r\n";
  mht += "\r\n";
  mht += "--" + boundary + "\r\n";
  mht += "Content-Type: text/html; charset=utf-8\r\n";
  mht += "Content-Transfer-Encoding: quoted-printable\r\n";
  mht += "Content-Location: " + baseUrl + "\r\n";
  mht += "\r\n";
  mht += html;
  mht += "\r\n";
  mht += "--" + boundary + "--\r\n";
  
  return mht;
}

async function handleFetchRequest(req: Request): Promise<Response> {
  const url = new URL(req.url).searchParams.get("url");
  
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    const finalUrl = response.url || url;
    const html = await response.text();
    const mht = generateMHT(html, finalUrl);
    
    return new Response(mht, {
      headers: {
        "Content-Type": "message/rfc822",
        "Content-Disposition": "inline; filename=\"" + new URL(url).hostname + ".mht\"",
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
      },
    });
  } catch (error) {
    return new Response("Error: " + error.message, {
      status: 502,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
      },
    });
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  
  if (url.pathname === "/" || url.pathname === "/index.html") {
    return new Response(HTML_PAGE, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Access-Control-Allow-Origin": ALLOWED_ORIGINS,
      },
    });
  }
  
  if (url.pathname === "/fetch" && req.method === "GET") {
    return handleFetchRequest(req);
  }

  return new Response("Not Found", { status: 404 });
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
