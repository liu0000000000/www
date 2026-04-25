const ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS") || "*";

const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>网页转MHT下载器</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #1a1a1a; color: #fff; min-height: 100vh; display: flex; flex-direction: column; }
    .header { background: #2d2d2d; padding: 20px; border-bottom: 1px solid #444; }
    .logo { font-size: 24px; font-weight: bold; color: #00d4ff; margin-bottom: 20px; }
    .address-bar { display: flex; gap: 10px; align-items: center; }
    .address-bar input { flex: 1; background: #1a1a1a; border: 1px solid #444; border-radius: 6px; padding: 12px 16px; color: #fff; font-size: 16px; outline: none; }
    .address-bar button { background: #00d4ff; border: none; color: #000; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 16px; transition: background 0.2s; }
    .address-bar button:hover { background: #00b8e6; }
    .content { flex: 1; padding: 20px; }
    .card { background: #2d2d2d; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .card h2 { color: #00d4ff; margin-bottom: 15px; font-size: 18px; }
    .status { background: #3d3d3d; border-radius: 6px; padding: 15px; margin: 10px 0; }
    .status.loading { border-left: 4px solid #00d4ff; }
    .status.error { border-left: 4px solid #ff6b6b; color: #ff6b6b; }
    .status.success { border-left: 4px solid #4ecdc4; color: #4ecdc4; }
    .history { margin-top: 20px; }
    .history-item { background: #3d3d3d; border-radius: 6px; padding: 10px 15px; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .history-item:hover { background: #4d4d4d; }
    .history-item .url { font-size: 14px; word-break: break-all; flex: 1; }
    .history-item .date { font-size: 12px; color: #888; margin-left: 10px; }
    .footer { background: #2d2d2d; padding: 15px 20px; border-top: 1px solid #444; text-align: center; font-size: 14px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🌐 MHT Downloader</div>
    <div class="address-bar">
      <input type="text" id="urlInput" placeholder="输入网址，例如 https://x.com" value="https://x.com">
      <button onclick="downloadMHT()">下载MHT</button>
    </div>
  </div>
  <div class="content">
    <div class="card">
      <h2>操作状态</h2>
      <div id="status" class="status"></div>
    </div>
    <div class="card">
      <h2>下载历史</h2>
      <div id="history" class="history"></div>
    </div>
  </div>
  <div class="footer">
    MHT Downloader v1.0 | 网页转MHT文件工具
  </div>
  <script>
    const PROXY_URL = window.location.origin;
    let downloadHistory = JSON.parse(localStorage.getItem('mht_download_history') || '[]');

    function updateHistory() {
      const container = document.getElementById('history');
      if (downloadHistory.length === 0) {
        container.innerHTML = '<div class="status">暂无下载历史</div>';
        return;
      }
      container.innerHTML = downloadHistory.map(item => 
        '<div class="history-item" onclick="loadFromHistory(\'' + item.url + '\')">' +
        '<div class="url">' + item.url + '</div>' +
        '<div class="date">' + new Date(item.timestamp).toLocaleString() + '</div>' +
        '</div>'
      ).join('');
    }

    function loadFromHistory(url) {
      document.getElementById('urlInput').value = url;
      downloadMHT();
    }

    function showStatus(message, type = 'info') {
      const status = document.getElementById('status');
      status.textContent = message;
      status.className = 'status ' + type;
    }

    async function downloadMHT() {
      const url = document.getElementById('urlInput').value.trim();
      if (!url) {
        showStatus('请输入网址', 'error');
        return;
      }

      showStatus('正在获取网页内容...', 'loading');

      try {
        const fullUrl = url.startsWith('http') ? url : 'https://' + url;
        showStatus('正在处理: ' + fullUrl, 'loading');
        
        const response = await fetch(PROXY_URL + '/download?url=' + encodeURIComponent(fullUrl));
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error('下载失败: ' + response.status + ' ' + errorText);
        }

        const blob = await response.blob();
        const filename = new URL(fullUrl).hostname + '_' + Date.now() + '.mht';
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 添加到历史记录
        downloadHistory.unshift({
          url: fullUrl,
          timestamp: Date.now()
        });
        if (downloadHistory.length > 20) downloadHistory.pop();
        localStorage.setItem('mht_download_history', JSON.stringify(downloadHistory));
        updateHistory();
        
        showStatus('MHT文件已开始下载', 'success');
      } catch (err) {
        showStatus('错误: ' + err.message, 'error');
      }
    }

    document.getElementById('urlInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') downloadMHT();
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

async function handleDownloadRequest(req: Request): Promise<Response> {
  const url = new URL(req.url).searchParams.get("url");
  
  if (!url) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    const finalUrl = response.url || url;
    const html = await response.text();
    const mht = generateMHT(html, finalUrl);
    
    const hostname = new URL(url).hostname;
    const filename = `${hostname}_${Date.now()}.mht`;
    
    return new Response(mht, {
      headers: {
        "Content-Type": "message/rfc822",
        "Content-Disposition": `attachment; filename="${filename}"`,
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
  
  if (url.pathname === "/download" && req.method === "GET") {
    return handleDownloadRequest(req);
  }

  return new Response("Not Found", { status: 404 });
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
