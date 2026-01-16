#!/bin/bash

# ============================================
# Script de configuration Named Tunnel Cloudflare
# ============================================
# Ce script crée un tunnel Cloudflare avec une URL stable
# ============================================

echo "🌐 Configuration Named Tunnel Cloudflare"
echo "========================================"
echo ""

# Vérifier que cloudflared est installé
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared n'est pas installé"
    echo ""
    echo "Installation :"
    echo "  brew install cloudflare/cloudflare/cloudflared"
    exit 1
fi

echo "✅ cloudflared installé"
echo ""

# Étape 1 : Login Cloudflare
echo "📝 Étape 1 : Login Cloudflare"
echo "------------------------------"
echo ""
echo "Cette commande va ouvrir ton navigateur pour te connecter à Cloudflare."
echo "Si tu n'as pas de compte, crée-en un (gratuit)."
echo ""
read -p "Appuie sur Entrée pour continuer..."
echo ""

cloudflared tunnel login

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Login échoué. Réessaye ou crée un compte sur https://cloudflare.com"
    exit 1
fi

echo ""
echo "✅ Login réussi !"
echo ""

# Étape 2 : Créer le tunnel
echo "📝 Étape 2 : Créer le tunnel 'medflash'"
echo "----------------------------------------"
echo ""

# Vérifier si le tunnel existe déjà
if cloudflared tunnel list 2>/dev/null | grep -q "medflash"; then
    echo "⚠️  Un tunnel 'medflash' existe déjà"
    echo ""
    read -p "Veux-tu le supprimer et en créer un nouveau ? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cloudflared tunnel delete medflash
        echo "✅ Ancien tunnel supprimé"
    else
        echo "ℹ️  On utilise le tunnel existant"
    fi
fi

# Créer le tunnel si nécessaire
if ! cloudflared tunnel list 2>/dev/null | grep -q "medflash"; then
    cloudflared tunnel create medflash
    if [ $? -ne 0 ]; then
        echo "❌ Échec de la création du tunnel"
        exit 1
    fi
    echo "✅ Tunnel 'medflash' créé !"
else
    echo "✅ Tunnel 'medflash' prêt"
fi

echo ""

# Récupérer l'UUID du tunnel
TUNNEL_UUID=$(cloudflared tunnel list | grep medflash | awk '{print $1}')

if [ -z "$TUNNEL_UUID" ]; then
    echo "❌ Impossible de récupérer l'UUID du tunnel"
    exit 1
fi

echo "🔑 UUID du tunnel : $TUNNEL_UUID"
echo ""

# Étape 3 : Créer le fichier de config
echo "📝 Étape 3 : Configuration du tunnel"
echo "-------------------------------------"
echo ""

# Trouver le fichier credentials
CRED_FILE=$(ls ~/.cloudflared/*.json 2>/dev/null | grep "$TUNNEL_UUID" | head -n 1)

if [ -z "$CRED_FILE" ]; then
    CRED_FILE="~/.cloudflared/${TUNNEL_UUID}.json"
fi

echo "Fichier credentials : $CRED_FILE"
echo ""

# Créer le config.yml
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
# Configuration du tunnel medflash
tunnel: $TUNNEL_UUID
credentials-file: $CRED_FILE

ingress:
  # Route tout vers le backend local
  - service: http://localhost:3333
EOF

echo "✅ Fichier de configuration créé : ~/.cloudflared/config.yml"
echo ""

# Étape 4 : Créer un DNS record
echo "📝 Étape 4 : Configuration DNS"
echo "-------------------------------"
echo ""
echo "⚠️  IMPORTANT : Pour avoir une URL custom (ex: medflash-api.ton-domaine.com),"
echo "   tu dois avoir un domaine sur Cloudflare."
echo ""
echo "Options :"
echo "  1. J'ai un domaine sur Cloudflare → Je configure un DNS"
echo "  2. Je n'ai pas de domaine → J'utilise l'URL Cloudflare (*.trycloudflare.com)"
echo ""
read -p "Choix (1 ou 2) : " -n 1 -r
echo ""

if [[ $REPLY =~ ^1$ ]]; then
    echo ""
    read -p "Entre ton domaine (ex: mon-domaine.com) : " DOMAIN
    read -p "Entre le sous-domaine souhaité (ex: api) : " SUBDOMAIN
    
    HOSTNAME="${SUBDOMAIN}.${DOMAIN}"
    
    echo ""
    echo "🌐 Configuration du DNS pour $HOSTNAME"
    
    cloudflared tunnel route dns medflash "$HOSTNAME"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ DNS configuré !"
        echo ""
        echo "🎉 Ton API sera accessible sur :"
        echo "   https://$HOSTNAME"
        
        # Mettre à jour le config.yml avec le hostname
        cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_UUID
credentials-file: $CRED_FILE

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:3333
  - service: http_status:404
EOF
        
        FINAL_URL="https://$HOSTNAME"
    else
        echo ""
        echo "❌ Échec de la configuration DNS"
        echo "   Vérifie que le domaine est bien sur ton compte Cloudflare"
        exit 1
    fi
else
    echo ""
    echo "✅ OK, on utilise l'URL Cloudflare par défaut"
    echo ""
    echo "⚠️  Note : L'URL sera du type https://xxxx.cfargotunnel.com"
    echo "   (moins joli mais fonctionne parfaitement)"
    
    FINAL_URL="URL_DU_TUNNEL"
fi

echo ""
echo "========================================"
echo "🎉 Configuration terminée !"
echo "========================================"
echo ""
echo "📋 Pour démarrer le tunnel :"
echo ""
echo "   cloudflared tunnel run medflash"
echo ""
echo "   Ou en arrière-plan :"
echo "   cloudflared tunnel run medflash &"
echo ""
echo "📝 Mets à jour ton .env :"
echo "   EXPO_PUBLIC_API_BASE_URL=$FINAL_URL"
echo ""
echo "🔄 Redémarre Expo :"
echo "   npx expo start -c"
echo ""
echo "💡 Pour que le tunnel démarre automatiquement au boot :"
echo "   cloudflared service install"
echo "   sudo launchctl load /Library/LaunchDaemons/com.cloudflare.cloudflared.plist"
echo ""

