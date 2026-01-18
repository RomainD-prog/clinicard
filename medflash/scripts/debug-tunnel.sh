#!/bin/bash

# Script de débogage tunnel Cloudflare
echo "🔍 Diagnostic du tunnel Cloudflare"
echo "=================================="
echo ""

# 1. Vérifie que le backend répond
echo "1️⃣  Test backend local (port 3333)..."
if curl -s -m 5 http://localhost:3333/health > /dev/null 2>&1; then
    echo "✅ Backend OK sur localhost:3333"
    RESPONSE=$(curl -s http://localhost:3333/health)
    echo "   → $RESPONSE"
else
    echo "❌ Backend ne répond pas sur localhost:3333"
    echo ""
    echo "Vérifie que le backend tourne :"
    echo "   cd backend && npm run dev"
    exit 1
fi
echo ""

# 2. Vérifie 0.0.0.0
echo "2️⃣  Test backend sur 0.0.0.0:3333..."
if curl -s -m 5 http://0.0.0.0:3333/health > /dev/null 2>&1; then
    echo "✅ Backend OK sur 0.0.0.0:3333"
else
    echo "⚠️  Backend ne répond pas sur 0.0.0.0:3333 (mais OK sur localhost)"
fi
echo ""

# 3. Vérifie les processus
echo "3️⃣  Processus actifs..."
BACKEND_PROCESS=$(ps aux | grep "node.*backend" | grep -v grep | head -n 1)
TUNNEL_PROCESS=$(ps aux | grep "cloudflared tunnel" | grep -v grep | head -n 1)

if [ -z "$BACKEND_PROCESS" ]; then
    echo "❌ Aucun processus node backend détecté"
else
    echo "✅ Backend process actif"
    echo "   PID: $(echo $BACKEND_PROCESS | awk '{print $2}')"
fi

if [ -z "$TUNNEL_PROCESS" ]; then
    echo "❌ Aucun processus cloudflared détecté"
else
    echo "✅ Cloudflared process actif"
    echo "   PID: $(echo $TUNNEL_PROCESS | awk '{print $2}')"
fi
echo ""

# 4. Vérifie les ports en écoute
echo "4️⃣  Ports en écoute..."
if command -v lsof &> /dev/null; then
    PORT_3333=$(lsof -i :3333 -sTCP:LISTEN -t 2>/dev/null)
    if [ -n "$PORT_3333" ]; then
        echo "✅ Port 3333 en écoute (PID: $PORT_3333)"
    else
        echo "❌ Aucun processus n'écoute sur le port 3333"
    fi
else
    echo "⚠️  lsof non disponible, skip"
fi
echo ""

echo "=================================="
echo "📋 Checklist de débogage"
echo "=================================="
echo ""
echo "Si le curl sur le tunnel ne retourne rien :"
echo ""
echo "1. Redémarre cloudflared avec --loglevel debug :"
echo "   cloudflared tunnel --url http://localhost:3333 --loglevel debug"
echo ""
echo "2. Fais un curl depuis un autre terminal et regarde les logs cloudflared"
echo ""
echo "3. Essaie avec 127.0.0.1 au lieu de localhost :"
echo "   cloudflared tunnel --url http://127.0.0.1:3333"
echo ""
echo "4. Vérifie qu'il n'y a pas de firewall qui bloque :"
echo "   Préférences Système > Sécurité > Pare-feu"
echo ""
echo "5. Teste depuis le navigateur au lieu de curl"
echo ""

