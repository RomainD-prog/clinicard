#!/bin/bash
# Script de diagnostic complet

echo "🔍 DIAGNOSTIC MEDFLASH"
echo "====================="
echo ""

# 1. Backend local
echo "1️⃣ Backend local (localhost:3333)..."
if curl -s --max-time 3 http://localhost:3333/health > /dev/null 2>&1; then
  echo "   ✅ Backend répond sur localhost:3333"
  curl -s http://localhost:3333/health
else
  echo "   ❌ Backend ne répond PAS sur localhost:3333"
  echo "   💡 Vérifie qu'il tourne avec: cd backend && node src/index.js"
fi

echo ""

# 2. IP locale
echo "2️⃣ Ton IP locale..."
IP=$(ipconfig getifaddr en0 2>/dev/null || echo "introuvable")
echo "   IP: $IP"

if [ "$IP" != "introuvable" ]; then
  echo "   Test sur l'IP locale..."
  if curl -s --max-time 3 http://$IP:3333/health > /dev/null 2>&1; then
    echo "   ✅ Backend accessible via $IP:3333"
  else
    echo "   ❌ Backend PAS accessible via $IP:3333"
    echo "   💡 Problème potentiel de firewall"
  fi
fi

echo ""

# 3. Configuration .env
echo "3️⃣ Configuration .env..."
if [ -f .env ]; then
  echo "   EXPO_PUBLIC_API_BASE_URL: $(grep EXPO_PUBLIC_API_BASE_URL .env | cut -d= -f2)"
else
  echo "   ❌ Fichier .env introuvable"
fi

echo ""

# 4. Appareil de test
echo "4️⃣ Sur quel appareil testes-tu ?"
echo "   a) iOS Simulator → utilise localhost:3333 ✅"
echo "   b) Android Emulator → utilise 10.0.2.2:3333"
echo "   c) Téléphone physique → utilise $IP:3333"

echo ""
echo "📋 RECOMMANDATIONS:"
echo ""
echo "   • iOS Simulator:"
echo "     EXPO_PUBLIC_API_BASE_URL=http://localhost:3333"
echo ""
echo "   • Android Emulator:"
echo "     EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3333"
echo ""
echo "   • Téléphone physique (même WiFi):"
echo "     EXPO_PUBLIC_API_BASE_URL=http://$IP:3333"
echo ""
echo "   Après modification du .env:"
echo "   1. Arrête Expo (Ctrl+C)"
echo "   2. npx expo start --clear"
echo "   3. Recharge l'app (r dans le terminal)"
echo ""

