# 💳 Configuration RevenueCat - CliniCard

## 📋 Ce qui a été fait

✅ Installation du SDK `react-native-purchases`  
✅ Service `src/services/purchases.ts` créé  
✅ Logique d'abonnement ajoutée au store  
✅ Composant Paywall créé (`app/paywall.tsx`)  
✅ Limitation à 5 decks gratuits implémentée  
✅ Initialisation RevenueCat dans `app/_layout.tsx`

---

## 🚀 Étapes de configuration (À faire)

### 1. Créer un compte RevenueCat (5 min)

1. Va sur https://app.revenuecat.com/signup
2. Inscris-toi avec ton email
3. Crée un nouveau projet : **"CliniCard"**

---

### 2. Configurer les produits dans App Store Connect (Apple)

#### A. Créer les produits dans App Store Connect

1. Va sur https://appstoreconnect.a´¡pple.com
2. Mon Apps → CliniCard → Abonnements
3. Crée un **Groupe d'abonnements** : "CliniCard Premium"
4. Ajoute 2 produits :

**Produit 1 : Mensuel**
- ID produit : `clinicard_monthly_399`
- Nom : CliniCard Premium (Mensuel)
- Prix : 3,99€/mois
- Durée : 1 mois

**Produit 2 : Annuel** (Recommandé)
- ID produit : `clinicard_yearly_2999`
- Nom : CliniCard Premium (Annuel)
- Prix : 29,99€/an
- Durée : 1 an
x
#### B. Ajouter les produits dans RevenueCat

1. Dans RevenueCat Dashboard → Products
2. Clique sur "Add Product"
3. Sélectionne "App Store"
4. Entre l'ID : `clinicard_monthly_399`
5. Répète pour `clinicard_yearly_2999`

---

### 3. Configurer les produits dans Google Play Console (Android)

#### A. Créer les produits dans Play Console

1. Va sur https://play.google.com/console
2. CliniCard → Produits → Abonnements
3. Crée un nouveau groupe d'abonnements : "CliniCard Premium"
4. Ajoute 2 produits :

**Produit 1 : Mensuel**
- ID produit : `clinicard_monthly_399`
- Nom : CliniCard Premium (Mensuel)
- Prix : 3,99€/mois
- Période de facturation : 1 mois

**Produit 2 : Annuel**
- ID produit : `clinicard_yearly_2999`
- Nom : CliniCard Premium (Annuel)
- Prix : 29,99€/an
- Période de facturation : 1 an

#### B. Ajouter dans RevenueCat

1. Dans RevenueCat Dashboard → Products
2. Clique sur "Add Product"
3. Sélectionne "Google Play"
4. Entre l'ID : `clinicard_monthly_399`
5. Répète pour `clinicard_yearly_2999`

---

### 4. Créer l'Entitlement et l'Offering dans RevenueCat

#### A. Créer l'Entitlement (= "Premium Access")

1. Dans RevenueCat → Entitlements
2. Clique "New Entitlement"
3. Nom : `premium`
4. Identifier : `premium`
5. Attache tous les produits créés (monthly + yearly)

#### B. Créer l'Offering (= ce que tu proposes dans le Paywall)

1. Dans RevenueCat → Offerings
2. Clique "New Offering"
3. Identifier : `default`
4. Ajoute 2 packages :
   - **Package 1** : `$rc_monthly` → Produit `clinicard_monthly_399`
   - **Package 2** : `$rc_annual` → Produit `clinicard_yearly_2999`
5. Définis `$rc_annual` comme "Default Package"

---

### 5. Récupérer les clés API RevenueCat

1. Dans RevenueCat Dashboard → Settings → API Keys
2. Copie la **clé iOS** (commence par `appl_...`)
3. Copie la **clé Android** (commence par `goog_...`)

---

### 6. Mettre à jour le code avec tes clés

Ouvre `src/services/purchases.ts` et remplace :

```typescript
const REVENUECAT_API_KEY_IOS = "appl_YOUR_IOS_KEY"; // ⬅️ Colle ta clé iOS ici
const REVENUECAT_API_KEY_ANDROID = "goog_YOUR_ANDROID_KEY"; // ⬅️ Colle ta clé Android ici
```

---

### 7. Tester en mode Sandbox

#### iOS (TestFlight ou Simulateur)
1. Crée un compte Apple Sandbox dans App Store Connect
2. Settings → Tester & Invited Users → Sandbox Testers
3. Utilise ce compte pour tester l'achat dans l'app

#### Android (Test interne)
1. Ajoute-toi comme testeur dans Play Console
2. Active "License Testing" dans Play Console
3. Installe via lien test interne

---

## 📱 Flow utilisateur

### Utilisateur gratuit (0-5 decks)
1. Peut générer jusqu'à 5 decks
2. À la 6ème génération → Popup "Limite atteinte" avec bouton "Voir Premium"
3. Clic → Redirection vers `/paywall`

### Paywall
1. Affiche les 2 offres (mensuel + annuel)
2. Badge "POPULAIRE" sur l'annuel
3. Bouton "Restaurer mes achats" en bas
4. Après achat réussi → `isSubscribed = true`

### Utilisateur Premium
1. Aucune limite de génération
2. Badge "Premium" dans Settings (optionnel)

---

## 🧪 Tester sans payer

RevenueCat propose un mode "Sandbox" automatique :
- Sur iOS : Utilise un compte Sandbox Apple
- Sur Android : Active "License Testing" dans Play Console
- Tous les achats sont gratuits en développement

---

## 📊 Analytics

RevenueCat Dashboard te donnera :
- Nombre d'abonnés actifs
- Revenus mensuels / annuels
- Taux de conversion
- Churn rate
- Essais gratuits (si tu les actives)

---

## 🔧 Troubleshooting

### Erreur "No offerings available"
→ Vérifie que tu as bien créé un Offering `default` dans RevenueCat

### Erreur "Product not found"
→ Les IDs de produits doivent être **identiques** dans :
  - App Store Connect
  - Google Play Console
  - RevenueCat Dashboard

### L'achat ne se lance pas
→ Vérifie que tu as bien ajouté les **entitlements** dans `info.plist` (iOS) ou dans le manifest (Android)

---

## 💰 Coûts

**RevenueCat** : Gratuit jusqu'à 10 000$/mois de revenus  
**Apple** : 99$/an (déjà payé)  
**Google** : 25$ one-time (déjà payé)  
**Commission stores** :
- Apple : 15% (première année) puis 30%
- Google : 15% (première année) puis 30%

Avec 10 abonnés à 29,99€/an = 299,90€/an  
- Commission 15% = 45€  
- Net = **255€/an** ✅ Rentable dès 10 abonnés

---

## 📚 Documentation officielle

- RevenueCat : https://www.revenuecat.com/docs
- React Native Purchases : https://docs.revenuecat.com/docs/reactnative
- App Store Connect : https://developer.apple.com/app-store-connect/
- Google Play Console : https://support.google.com/googleplay/android-developer

---

## ✅ Checklist finale

- [ ] Compte RevenueCat créé
- [ ] Produits créés dans App Store Connect
- [ ] Produits créés dans Google Play Console
- [ ] Produits ajoutés dans RevenueCat
- [ ] Entitlement "premium" créé
- [ ] Offering "default" créé
- [ ] Clés API copiées dans `purchases.ts`
- [ ] Test en Sandbox iOS
- [ ] Test en Sandbox Android
- [ ] Build TestFlight/Internal Test envoyé
- [ ] 🚀 Prêt pour production !
