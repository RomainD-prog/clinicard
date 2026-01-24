#!/bin/bash

# ============================================
# Script de débogage Cloudflare Tunnel
# ============================================
# Ce script aide à diagnostiquer pourquoi le tunnel ne fonctionne pas
# ============================================

echo "🔍 Diagnostic Cloudflare Tunnel + Backend"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Vérifier si cloudflared est installé
echo "1️⃣  Vérification de cloudflared..."
if command -v cloudflared &> /dev/null; then
    VERSION=$(cloudflared --version 2>&1 | head -n 1)
    echo -e "${GREEN}✅ cloudflared est installé${NC}"
    echo "   Version: $VERSION"
else
    echo -e "${RED}❌ cloudflared n'est pas installé${NC}"
    echo ""
    echo "📦 Installation (avec Homebrew) :"
    echo "   brew install cloudflare/cloudflare/cloudflared"
    exit 1
fi
echo ""

# 2. Vérifier si le backend tourne
echo "2️⃣  Vérification du backend local..."
if curl -s http://localhost:3333/health > /dev/null 2>&1; then
    RESPONSE=$(curl -s http://localhost:3333/health)
    echo -e "${GREEN}✅ Backend répond sur http://localhost:3333${NC}"
    echo "   Réponse: $RESPONSE"
else
    echo -e "${RED}❌ Backend ne répond pas sur http://localhost:3333${NC}"
    echo ""
    echo "🚀 Démarre ton backend :"
    echo "   cd backend"
    echo "   npm run dev"
    exit 1
fi
echo ""

# 3. Lire le tunnel actif (si le processus tourne)
echo "3️⃣  Vérification du tunnel Cloudflare..."
TUNNEL_PROCESS=$(ps aux | grep "cloudflared tunnel" | grep -v grep | head -n 1)

if [ -z "$TUNNEL_PROCESS" ]; then
    echo -e "${YELLOW}⚠️  Aucun tunnel actif détecté${NC}"
    echo ""
    echo "🌐 Démarre un tunnel Quick Tunnel :"
    echo "   cloudflared tunnel --url http://localhost:3333"
    echo ""
    echo "📝 Copie l'URL qui s'affiche (ex: https://xxxxx.trycloudflare.com)"
    exit 1
else
    echo -e "${GREEN}✅ Tunnel Cloudflare actif${NC}"
    echo "   Processus: $(echo $TUNNEL_PROCESS | awk '{print $2}')"
fi
echo ""

# 4. Instructions pour tester le tunnel
echo "4️⃣  Test du tunnel public..."
echo ""
echo -e "${BLUE}📋 Pour tester ton tunnel :${NC}"
echo ""
echo "1. Récupère l'URL du tunnel dans les logs cloudflared"
echo "   (ex: https://xxxxx.trycloudflare.com)"
echo ""
echo "2. Teste avec curl :"
echo "   curl https://xxxxx.trycloudflare.com/health"
echo ""
echo "3. Tu dois voir : {\"ok\":true,\"uptime\":...}"
echo ""
echo "4. Si ça marche, mets l'URL dans ton .env :"
echo "   EXPO_PUBLIC_API_BASE_URL=https://xxxxx.trycloudflare.com"
echo "   EXPO_PUBLIC_MOCK_API=false"
echo ""
echo "5. Redémarre Expo en clean :"
echo "   npx expo start -c"
echo ""

# 5. Checklist des problèmes courants
echo "=========================================="
echo "🔧 Checklist si ça ne marche pas :"
echo "=========================================="
echo ""
echo "❓ Pas de réponse 200 sur le tunnel ?"
echo ""
echo "✅ Vérifie que le backend tourne :"
echo "   curl http://localhost:3333/health"
echo ""
echo "✅ Vérifie le port du tunnel :"
echo "   cloudflared tunnel --url http://localhost:3333"
echo "   (PAS 3000, c'est bien 3333)"
echo ""
echo "✅ Teste l'URL du tunnel dans le navigateur :"
echo "   https://xxxxx.trycloudflare.com/health"
echo ""
echo "✅ Regarde les logs cloudflared pour voir si des requêtes arrivent"
echo ""
echo "✅ Vérifie que CORS est bien configuré (* en dev) :"
echo "   Le backend a déjà CORS_ORIGIN=* par défaut, c'est OK"
echo ""
echo "✅ Redémarre le tunnel si l'URL a changé :"
echo "   Ctrl+C dans le terminal cloudflared"
echo "   cloudflared tunnel --url http://localhost:3333"
echo ""

echo "=========================================="
echo "💡 Besoin d'un tunnel stable (URL fixe) ?"
echo "=========================================="
echo ""
echo "Les Quick Tunnels changent d'URL à chaque démarrage."
echo "Pour une URL stable, utilise un Named Tunnel (gratuit) :"
echo ""
echo "1. Login Cloudflare :"
echo "   cloudflared tunnel login"
echo ""
echo "2. Crée un tunnel nommé :"
echo "   cloudflared tunnel create medflash"
echo ""
echo "3. Configure et démarre :"
echo "   (on fera ça ensemble si besoin)"
echo ""

