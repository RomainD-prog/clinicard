#!/bin/bash

# Script pour mettre à jour l'URL de l'API dans le .env

TUNNEL_URL="$1"

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Usage: bash scripts/update-api-url.sh <tunnel-url>"
    echo ""
    echo "Exemple:"
    echo "  bash scripts/update-api-url.sh https://lopez-runs-mysql-rehab.trycloudflare.com"
    exit 1
fi

ENV_FILE=".env"

echo "🔧 Mise à jour de l'API URL dans $ENV_FILE"
echo ""

# Backup du .env
cp .env .env.backup
echo "✅ Backup créé : .env.backup"

# Mise à jour ou ajout de EXPO_PUBLIC_API_BASE_URL
if grep -q "EXPO_PUBLIC_API_BASE_URL=" .env; then
    # Remplace la ligne existante
    sed -i '' "s|EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=$TUNNEL_URL|" .env
    echo "✅ EXPO_PUBLIC_API_BASE_URL mis à jour"
else
    # Ajoute la ligne
    echo "EXPO_PUBLIC_API_BASE_URL=$TUNNEL_URL" >> .env
    echo "✅ EXPO_PUBLIC_API_BASE_URL ajouté"
fi

# Mise à jour ou ajout de EXPO_PUBLIC_MOCK_API
if grep -q "EXPO_PUBLIC_MOCK_API=" .env; then
    sed -i '' "s|EXPO_PUBLIC_MOCK_API=.*|EXPO_PUBLIC_MOCK_API=false|" .env
    echo "✅ EXPO_PUBLIC_MOCK_API mis à jour (false)"
else
    echo "EXPO_PUBLIC_MOCK_API=false" >> .env
    echo "✅ EXPO_PUBLIC_MOCK_API ajouté (false)"
fi

echo ""
echo "🎉 Configuration terminée !"
echo ""
echo "📋 Prochaines étapes :"
echo "  1. Redémarre Expo en clean :"
echo "     npx expo start -c"
echo ""
echo "  2. Teste l'import dans l'app"
echo ""

