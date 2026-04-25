# X Website Proxy

A Deno-based proxy server to allow users in China to access X website (formerly Twitter).

## Features
- HTTP/HTTPS proxy for X website
- CORS support
- Error handling
- Simple deployment on Deno

## Requirements
- Deno runtime (v1.30.0+)
- Foreign server with unrestricted internet access

## Usage

### Local Development
```bash
deno run --allow-net mod.ts
```

### Deployment on Deno Deploy
1. Create a Deno Deploy account at https://deno.com/deploy
2. Connect your GitHub repository or upload the files directly:
   - Option 1: Connect GitHub repository
     - Create a new repository on GitHub
     - Push the project files to the repository
     - Connect the repository to Deno Deploy
   - Option 2: Upload files directly
     - Go to Deno Deploy dashboard
     - Click "New Project"
     - Select "Upload"
     - Upload all project files (mod.ts, deno.json, README.md)
3. Set the entry point to `mod.ts`
4. Click "Deploy"
5. Once deployed, you'll get a unique URL for your proxy server
6. Use this URL to access X website from China

## Configuration
- `X_DOMAIN`: The domain of X website (default: "x.com")
- `PORT`: The port to run the proxy server on (default: 8080)

## How It Works
1. The proxy server receives requests from clients
2. It forwards these requests to the X website
3. It returns the response from X website to the client
4. CORS headers are added to allow cross-origin requests

## Security Considerations
- This proxy is intended for personal use only
- Do not share your proxy URL publicly
- Be aware of the legal implications in your jurisdiction
