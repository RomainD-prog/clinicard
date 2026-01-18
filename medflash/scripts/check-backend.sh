#!/bin/bash
# Script pour vérifier l'état du backend

echo "🔍 Vérification du backend MedFlash..."
echo ""

# Test de connexion
echo "1️⃣ Test connexion backend..."
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
if [ -n "$HEALTH" ]; then
  echo "✅ Backend répond: $HEALTH"
else
  echo "❌ Backend ne répond pas sur http://localhost:3001"
  echo ""
  echo "💡 Pour démarrer le backend:"
  echo "   cd backend && node src/index.js"
  exit 1
fi

echo ""
echo "2️⃣ Vérification des variables d'environnement..."
if [ -f .env ]; then
  if grep -q "OPENAI_API_KEY=sk-" .env 2>/dev/null; then
    echo "✅ OPENAI_API_KEY configurée"
  else
    echo "⚠️  OPENAI_API_KEY manquante ou vide dans .env"
  fi
  
  if grep -q "ANTHROPIC_API_KEY=sk-" .env 2>/dev/null; then
    echo "✅ ANTHROPIC_API_KEY configurée"
  else
    echo "⚠️  ANTHROPIC_API_KEY manquante (optionnelle)"
  fi
else
  echo "❌ Fichier .env introuvable"
  echo ""
  echo "💡 Copiez .env.example vers .env et configurez vos clés API"
fi

echo ""
echo "3️⃣ Base de données SQLite..."
if [ -f backend/data.db ]; then
  SIZE=$(du -h backend/data.db | cut -f1)
  echo "✅ Base de données: backend/data.db ($SIZE)"
else
  echo "⚠️  Base de données sera créée au premier démarrage"
fi

echo ""
echo "✅ Vérification terminée !"

