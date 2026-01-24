#!/bin/bash
# Script de configuration des variables d'environnement EAS
# À exécuter manuellement : bash scripts/setup-eas-env.sh

set -e

echo "🔧 Configuration des variables d'environnement EAS pour MedFlash"
echo ""

# Variables
API_URL="https://medflash-api.tri-pacer.fr"
SUPABASE_URL="https://fcynbbggrholkmxpuftu.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeW5iYmdncmhvbGtteHB1ZnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5ODYxOTYsImV4cCI6MjA4MzU2MjE5Nn0.CshjCKwclRzNJAI4BIruP1aYwTakeTx9SYKFYPxbmvI"

echo "📝 Variables à configurer:"
echo "  - EXPO_PUBLIC_API_BASE_URL: $API_URL"
echo "  - EXPO_PUBLIC_SUPABASE_URL: $SUPABASE_URL"
echo "  - EXPO_PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_KEY:0:50}..."
echo "  - EXPO_PUBLIC_MOCK_API: false"
echo ""

# Fonction pour créer une variable d'env
create_env() {
  local name=$1
  local value=$2
  
  echo "🔄 Création de $name..."
  
  # Créer pour production
  eas env:create --name "$name" --value "$value" --environment production --visibility plaintext --non-interactive 2>/dev/null || \
  eas env:create --name "$name" --value "$value" --environment production --visibility plaintext || \
  echo "⚠️  Variable $name existe déjà ou erreur lors de la création"
  
  # Créer pour preview
  eas env:create --name "$name" --value "$value" --environment preview --visibility plaintext --non-interactive 2>/dev/null || \
  eas env:create --name "$name" --value "$value" --environment preview --visibility plaintext || \
  echo "⚠️  Variable $name existe déjà ou erreur lors de la création (preview)"
}

echo "🚀 Création des variables..."
echo ""

create_env "EXPO_PUBLIC_API_BASE_URL" "$API_URL"
create_env "EXPO_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
create_env "EXPO_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_KEY"
create_env "EXPO_PUBLIC_MOCK_API" "false"

echo ""
echo "✅ Configuration terminée !"
echo ""
echo "📋 Vérifier les variables créées:"
echo "   eas env:list"
echo ""
echo "🔧 Pour modifier une variable:"
echo "   eas env:update --name VARIABLE_NAME --value NEW_VALUE"
echo ""

