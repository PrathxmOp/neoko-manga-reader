# 🌐 Cloudflare Tunnel & Production Deployment Guide for NEOKO

This guide details how to expose **NEOKO Manga Stream Reader** to the public internet using **Cloudflare Tunnel (`cloudflared`)**, while ensuring:
1. **Frontend Anti-Scraper Protection** (Blocks right-click, image dragging, inspect shortcuts `F12`, `Ctrl+U`, `Ctrl+Shift+I`).
2. **Cloudflare WAF CAPTCHA / Managed Challenge** (Forces bots & scrapers to solve a Cloudflare CAPTCHA).
3. **Backend WebUI Password Lock** (Requires Basic Auth password to manage Suwayomi extensions or admin panel).

---

## 🔒 Step 1: Start Secured Backend Containers

1. Make sure your `docker-compose.yml` has network isolation and Basic Auth enabled:

```yaml
services:
  suwayomi:
    image: ghcr.io/suwayomi/suwayomi-server:latest
    container_name: suwayomi
    ports:
      - "127.0.0.1:4567:4567" # Isolated to localhost
    volumes:
      - ./suwayomi-data:/home/suwayomi/.local/share/Tachidesk
    environment:
      - TZ=Asia/Kolkata
      - SUWAYOMI_SERVER_BASIC_AUTH_ENABLED=true
      - SUWAYOMI_SERVER_BASIC_AUTH_USERNAME=admin
      - SUWAYOMI_SERVER_BASIC_AUTH_PASSWORD=your_secure_admin_password
    restart: unless-stopped
```

2. Start the backend:
```bash
docker compose up -d
```

> 🛡️ **Result:** The Suwayomi WebUI (`http://localhost:4567`) is now password protected! Anyone visiting the admin panel to enable/disable extensions must provide the username (`admin`) and password.

---

## 🚀 Step 2: Build & Start NEOKO Production Server

1. Build the production bundle:
```bash
npm run build
```

2. Test the production server on port 3000:
```bash
npm run serve
```
NEOKO will run at `http://localhost:3000`.

---

## ☁️ Step 3: Install & Configure Cloudflare Tunnel (`cloudflared`)

### Option A: Using Cloudflare Zero Trust Dashboard (Recommended - Easiest)

1. Log into your **Cloudflare Dashboard** -> **Zero Trust** -> **Networks** -> **Tunnels**.
2. Click **Add a Tunnel** -> Select **Cloudflare Managed Tunnel**.
3. Name your tunnel (e.g. `neoko-manga`).
4. Install `cloudflared` on your Linux host by running the command displayed on screen:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   sudo cloudflared service install <YOUR_TUNNEL_TOKEN>
   ```
5. In the **Public Hostname** tab:
   - **Subdomain**: `neoko` (or your chosen subdomain)
   - **Domain**: `yourdomain.com`
   - **Type**: `HTTP`
   - **URL**: `localhost:3000`
6. Save and deploy! Your site is now live at `https://neoko.yourdomain.com`.

---

### Option B: CLI Setup (`cloudflared config.yml`)

1. Login to Cloudflare via CLI:
   ```bash
   cloudflared tunnel login
   ```
2. Create your tunnel:
   ```bash
   cloudflared tunnel create neoko
   ```
3. Create `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: <YOUR_TUNNEL_UUID>
   credentials-file: /home/prathxm/.cloudflared/<YOUR_TUNNEL_UUID>.json

   ingress:
     - hostname: neoko.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```
4. Run your tunnel:
   ```bash
   cloudflared tunnel run neoko
   ```

---

## 🛡️ Step 4: Configure Cloudflare WAF CAPTCHA / Bot Protection

To stop automated scraping tools, bots, and scrapers from making bulk requests:

### 1. Enable Cloudflare Bot Fight Mode & Managed Challenge
1. In Cloudflare Dashboard -> **Security** -> **Bots**.
2. Turn ON **Bot Fight Mode** or **Definitely Automated -> Block / Managed Challenge**.

### 2. Create WAF CAPTCHA Rule for Automated Scrapers
1. Go to **Security** -> **WAF** -> **Custom Rules** -> **Create Rule**.
2. **Rule Name**: `Block & CAPTCHA Scrapers`
3. **Field Configuration**:
   - `(http.user_agent contains "python") or (http.user_agent contains "curl") or (http.user_agent contains "wget") or (http.user_agent contains "Scrapy") or (http.request.uri.path contains "/api/" and http.referer eq "")`
4. **Action**: Choose **Managed Challenge (Cloudflare CAPTCHA)** or **JS Challenge**.
5. Save Rule.

### 3. Rate Limiting Protection (Stop Bulk Image Harvesting)
1. Go to **Security** -> **WAF** -> **Rate Limiting Rules**.
2. **Rule Name**: `Manga Scraper Rate Limit`
3. **Criteria**: If an IP makes more than `40 requests` in `10 seconds`.
4. **Action**: **Managed Challenge (Cloudflare Turnstile CAPTCHA)** for 1 hour.

---

## 🔍 Step 5: Verification Checklist

| Security Component | Status | Verification Method |
| :--- | :--- | :--- |
| **Frontend Anti-Scraper** | ✅ Active | Right-click, `F12`, `Ctrl+U`, `Ctrl+Shift+I`, and image dragging are blocked in browser. |
| **Transparent Image Overlay** | ✅ Active | Overlay layer prevents right-click image extensions from saving raw image files. |
| **Suwayomi WebUI Admin Auth** | ✅ Active | Visiting `http://localhost:4567` requires username & password to access extension controls. |
| **Localhost Isolation** | ✅ Active | Ports 4567 and 8191 are bound to `127.0.0.1`, stopping direct external IP access. |
| **Cloudflare CAPTCHA WAF** | ☁️ Configured | Automated scrapers receive a Cloudflare CAPTCHA challenge screen. |
