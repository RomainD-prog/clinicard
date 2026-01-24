#!/bin/bash
# Script pour démarrer backend + tunnel Cloudflare

cd "$(dirname "$0")/.."

echo "🚀 Démarrage de MedFlash..."
echo ""

# 1. Vérifier que le backend est démarré
echo "1️⃣ Vérification du backend..."
if curl -s http://localhost:3333/health > /dev/null 2>&1; then
  echo "   ✅ Backend actif sur http://localhost:3333"
else
  echo "   ⚠️  Backend non détecté"
  echo "   💡 Démarre-le dans un autre terminal:"
  echo "      cd backend && node src/index.js"
  echo ""
  read -p "   Appuie sur ENTER quand le backend est démarré..."
fi

# 2. Démarrer le tunnel Cloudflare
echo ""
echo "2️⃣ Démarrage du tunnel Cloudflare..."

# Vérifier si cloudflared est installé
if ! command -v cloudflared &> /dev/null; then
  echo "   ❌ cloudflared n'est pas installé"
  echo "   💡 Installe-le avec: brew install cloudflared"
  exit 1
fi

# Vérifier si le tunnel existe
if ! cloudflared tunnel list 2>/dev/null | grep -q "medflash"; then
  echo "   ❌ Tunnel 'medflash' introuvable"
  echo "   💡 Crée-le avec: cloudflared tunnel create medflash"
  exit 1
fi

# Arrêter les tunnels existants
pkill -f "cloudflared tunnel run" 2>/dev/null

# Démarrer le tunnel en background
echo "   🔄 Démarrage du tunnel..."
nohup cloudflared tunnel run medflash > /tmp/cloudflared-medflash.log 2>&1 &
TUNNEL_PID=$!

# Attendre que le tunnel soit prêt
echo "   ⏳ Attente de la connexion (10s)..."
sleep 10

# Tester la connexion
echo ""
echo "3️⃣ Test de connexion..."
if curl -s https://medflash-api.tri-pacer.fr/health > /dev/null 2>&1; then
  echo "   ✅ Tunnel actif: https://medflash-api.tri-pacer.fr"
  echo ""
  echo "📱 Configuration .env:"
  echo "   EXPO_PUBLIC_API_BASE_URL=https://medflash-api.tri-pacer.fr"
  echo ""
  echo "✅ Tout est prêt ! Tu peux:"
  echo "   • Lancer l'app: npx expo start"
  echo "   • Tester le backend: curl https://medflash-api.tri-pacer.fr/health"
  echo ""
  echo "📋 Logs du tunnel: tail -f /tmp/cloudflared-medflash.log"
  echo "🛑 Arrêter le tunnel: pkill -f 'cloudflared tunnel run'"
else
  echo "   ⚠️  Tunnel démarré mais pas encore connecté"
  echo "   📋 Vérifie les logs: tail -f /tmp/cloudflared-medflash.log"
  echo "   🔄 Ou teste manuellement: curl https://medflash-api.tri-pacer.fr/health"
fi

echo ""

