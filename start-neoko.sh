#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "🚀 Starting NEOKO Production Services..."

# 1. Start Suwayomi Server if not running
if ! pgrep -f "Suwayomi-Server.jar" > /dev/null; then
  echo "📦 Starting Suwayomi Backend Server..."
  cd "$DIR/Suwayomi-Server-v2.3.2243-linux-x64"
  nohup ./suwayomi-server.sh > "$DIR/suwayomi.log" 2>&1 &
  cd "$DIR"
  sleep 3
else
  echo "✅ Suwayomi Backend Server is already running."
fi

# 2. Start NEOKO Web App on port 3000
if ! lsof -i:3000 > /dev/null 2>&1; then
  echo "🌐 Starting NEOKO Web Reader (Port 3000)..."
  nohup npm run preview > "$DIR/neoko.log" 2>&1 &
  sleep 3
else
  echo "✅ NEOKO Web Reader is already running on port 3000."
fi

# 3. Start Cloudflare Tunnel
if ! pgrep -f "cloudflared" > /dev/null; then
  echo "☁️ Starting Cloudflare Tunnel..."
  nohup ./bin/cloudflared tunnel --url http://localhost:3000 > "$DIR/tunnel.log" 2>&1 &
  sleep 4
  echo "🔗 Cloudflare Live URL:"
  grep -i "trycloudflare.com" "$DIR/tunnel.log" || true
else
  echo "✅ Cloudflare Tunnel is already running."
  grep -i "trycloudflare.com" "$DIR/tunnel.log" || true
fi

echo "🎉 All NEOKO services are running continuously in background!"
