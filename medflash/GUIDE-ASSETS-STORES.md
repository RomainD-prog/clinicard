# 📸 Guide Assets & Descriptions pour les Stores - CliniCard

## 🎯 Objectif

Préparer tous les éléments nécessaires pour soumettre CliniCard sur l'App Store et Google Play Store.

---

## 📱 PARTIE 1 : Screenshots (CRITIQUE)

### 📐 Dimensions requises

#### iOS (App Store Connect)
- **iPhone 6.7"** (iPhone 14 Pro Max, 15 Pro Max) : **1290 x 2796 px** (minimum 3, max 10)
- **iPhone 5.5"** (iPhone 8 Plus) : **1242 x 2208 px** (minimum 3, max 10)

#### Android (Google Play Console)
- **Phone** : **1080 x 1920 px minimum** (minimum 2, max 8)
- **Feature Graphic** : **1024 x 500 px** (obligatoire)

---

### 🎨 Méthode recommandée : Screenshots dans l'app + Mockup

#### Étape 1 : Prendre les screenshots dans l'app

**5 écrans à capturer** (dans l'ordre recommandé) :

1. **Écran Library** (`app/(tabs)/library.tsx`)
   - Montre la liste des decks
   - Hero "Import PDF" visible
   - Quelques decks avec badges "New" ou "Active"

2. **Écran Import** (`app/import/index.tsx`)
   - Montre l'interface d'import PDF
   - Pills avec "Source", "Niveau", "Imports gratuits"
   - Bouton "Choisir les options"

3. **Écran Flashcard** (`app/review/session.tsx`)
   - Une carte de révision avec question/réponse révélée
   - Boutons "A revoir", "Difficile", "Bien", "Facile"
   - Progress bar visible

4. **Écran Quiz** (`app/deck/[deckId]/quiz.tsx`)
   - Une question QCM avec 4 options
   - Score visible si possible

5. **Écran Stats** (`app/deck/[deckId]/stats.tsx`)
   - Graphiques de progression
   - Statistiques visuelles

#### Étape 2 : Ajouter des device frames (Mockup)

**Option A : Shotsnapp** (Recommandé - Gratuit)
1. Va sur https://shotsnapp.com/
2. Upload tes screenshots
3. Choisis un iPhone 14 Pro Max (pour iOS) ou Pixel 7 (pour Android)
4. Télécharge les images finales

**Option B : MockUPhone** (Gratuit)
1. Va sur https://mockuphone.com/
2. Upload tes screenshots
3. Choisis le device
4. Télécharge

**Option C : Figma** (Si tu l'utilises déjà)
1. Installe le plugin "Mockup"
2. Importe tes screenshots
3. Applique les frames

---

### 📝 Checklist Screenshots

- [ ] 5 screenshots iPhone 6.7" (1290x2796)
- [ ] 5 screenshots iPhone 5.5" (1242x2208)
- [ ] 5 screenshots Android Phone (1080x1920)
- [ ] 1 Feature Graphic Android (1024x500)
- [ ] Tous les screenshots ont des device frames
- [ ] Les textes sont lisibles
- [ ] Les couleurs sont cohérentes

---

## 📝 PARTIE 2 : Descriptions pour les Stores

### 🍎 App Store (iOS)

#### Titre (30 caractères max)
```
CliniCard - Flashcards IA
```
*(29 caractères)*

#### Subtitle (30 caractères max)
```
Révisions médicales IA
```
*(24 caractères)*

#### Description complète (4000 caractères max)

```
📚 CliniCard - Flashcards médicales intelligentes

Transformez vos cours PDF en flashcards et QCM automatiquement grâce à l'intelligence artificielle. Conçu pour les étudiants en médecine (PASS, LAS, PACES).

✨ FONCTIONNALITÉS PRINCIPALES

• 📤 Import PDF instantané
  Uploadez vos cours et CliniCard génère automatiquement des questions adaptées à votre niveau

• 🎯 Flashcards intelligentes
  Des cartes mémoire optimisées par l'IA pour maximiser votre mémorisation

• 📝 QCM interactifs
  Des questions à choix multiples pour tester vos connaissances en conditions réelles

• 🧠 Révision espacée (Spaced Repetition)
  Un algorithme scientifique optimise votre apprentissage et vous rappelle au bon moment

• 📊 Statistiques détaillées
  Suivez votre progression, vos performances et vos points forts/faibles

• ☁️ Synchronisation cloud
  Révisez sur tous vos appareils, vos données sont sauvegardées automatiquement

• 🎨 Interface moderne
  Design épuré et intuitif, mode sombre disponible

• 🔔 Rappels personnalisés
  Configurez des notifications pour ne jamais oublier vos révisions

🎓 POUR QUI ?

• Étudiants en PASS (Première Année Commune aux Études de Santé)
• Étudiants en LAS (Licence Accès Santé)
• Étudiants en PACES
• Tous les étudiants en médecine qui veulent optimiser leurs révisions

💡 COMMENT ÇA MARCHE ?

1. Importez votre cours PDF
2. CliniCard analyse le contenu avec l'IA
3. Des flashcards et QCM sont générés automatiquement
4. Révisez avec l'algorithme de répétition espacée
5. Suivez votre progression

⭐ AVANTAGES

• Gain de temps : Plus besoin de créer manuellement vos flashcards
• Efficacité : L'IA adapte les questions à votre niveau
• Flexibilité : Révisez où et quand vous voulez
• Progression : Suivez vos statistiques en temps réel

🔒 CONFIDENTIALITÉ

Vos données sont sécurisées et privées. Nous ne vendons jamais vos informations personnelles.

📧 SUPPORT

Une question ? Contactez-nous : support@clinicard.app

---

Téléchargez CliniCard et transformez vos révisions dès aujourd'hui !
```

*(~1800 caractères - bien en dessous de la limite)*

#### Mots-clés (100 caractères max)
```
médecine,flashcards,IA,révision,PASS,LAS,PACES,QCM,étudiant,mémorisation
```
*(69 caractères)*

#### URL de support
```
https://romaind-prog.github.io/clinicard/privacy-policy.html
```
*(Utilise ta Privacy Policy comme page de support temporaire)*

#### URL marketing (optionnel)
```
https://romaind-prog.github.io/clinicard/
```

---

### 🤖 Google Play Store (Android)

#### Titre (50 caractères max)
```
CliniCard - Flashcards Médicales IA
```
*(38 caractères)*

#### Short Description (80 caractères max)
```
Transformez vos cours en flashcards IA. Pour PASS, LAS, PACES. Révisions optimisées.
```
*(79 caractères)*

#### Description complète (4000 caractères max)

```
📚 CliniCard - Flashcards médicales intelligentes

Transformez vos cours PDF en flashcards et QCM automatiquement grâce à l'intelligence artificielle. Conçu pour les étudiants en médecine (PASS, LAS, PACES).

✨ FONCTIONNALITÉS PRINCIPALES

• 📤 Import PDF instantané
  Uploadez vos cours et CliniCard génère automatiquement des questions adaptées à votre niveau

• 🎯 Flashcards intelligentes
  Des cartes mémoire optimisées par l'IA pour maximiser votre mémorisation

• 📝 QCM interactifs
  Des questions à choix multiples pour tester vos connaissances en conditions réelles

• 🧠 Révision espacée (Spaced Repetition)
  Un algorithme scientifique optimise votre apprentissage et vous rappelle au bon moment

• 📊 Statistiques détaillées
  Suivez votre progression, vos performances et vos points forts/faibles

• ☁️ Synchronisation cloud
  Révisez sur tous vos appareils, vos données sont sauvegardées automatiquement

• 🎨 Interface moderne
  Design épuré et intuitif, mode sombre disponible

• 🔔 Rappels personnalisés
  Configurez des notifications pour ne jamais oublier vos révisions

🎓 POUR QUI ?

• Étudiants en PASS (Première Année Commune aux Études de Santé)
• Étudiants en LAS (Licence Accès Santé)
• Étudiants en PACES
• Tous les étudiants en médecine qui veulent optimiser leurs révisions

💡 COMMENT ÇA MARCHE ?

1. Importez votre cours PDF
2. CliniCard analyse le contenu avec l'IA
3. Des flashcards et QCM sont générés automatiquement
4. Révisez avec l'algorithme de répétition espacée
5. Suivez votre progression

⭐ AVANTAGES

• Gain de temps : Plus besoin de créer manuellement vos flashcards
• Efficacité : L'IA adapte les questions à votre niveau
• Flexibilité : Révisez où et quand vous voulez
• Progression : Suivez vos statistiques en temps réel

🔒 CONFIDENTIALITÉ

Vos données sont sécurisées et privées. Nous ne vendons jamais vos informations personnelles.

📧 SUPPORT

Une question ? Contactez-nous : support@clinicard.app

---

Téléchargez CliniCard et transformez vos révisions dès aujourd'hui !
```

*(Même contenu que iOS - ~1800 caractères)*

#### Catégorie
```
Éducation
```

#### Contenu cible
```
Tous publics
```

#### URL de confidentialité
```
https://romaind-prog.github.io/clinicard/privacy-policy.html
```

---

## 🎨 PARTIE 3 : Feature Graphic Android (1024x500)

### Design recommandé

**Option simple** : Utilise Canva ou Figma

1. **Fond** : Dégradé bleu (#137FEC → #0A5FA3)
2. **Titre** : "CliniCard" en grand (police moderne)
3. **Sous-titre** : "Flashcards médicales IA"
4. **Éléments visuels** :
   - Icône de l'app (centrée ou à gauche)
   - Mockup d'un iPhone avec un screenshot de l'app (à droite)
   - Badge "IA" ou "Premium" si tu veux

**Template Canva** :
- Recherche "Google Play Feature Graphic"
- Taille : 1024 x 500 px
- Utilise les couleurs de CliniCard (#137FEC)

---

## 📋 Checklist finale avant soumission

### Assets
- [ ] 5 screenshots iOS iPhone 6.7" (1290x2796)
- [ ] 5 screenshots iOS iPhone 5.5" (1242x2208)
- [ ] 5 screenshots Android Phone (1080x1920)
- [ ] Feature Graphic Android (1024x500)
- [ ] Tous les screenshots ont des device frames

### Descriptions
- [ ] Titre iOS (30 caractères max)
- [ ] Subtitle iOS (30 caractères max)
- [ ] Description iOS complète
- [ ] Mots-clés iOS (100 caractères max)
- [ ] Titre Android (50 caractères max)
- [ ] Short Description Android (80 caractères max)
- [ ] Description Android complète

### Informations légales
- [ ] URL Privacy Policy (déjà fait ✅)
- [ ] Email de support
- [ ] Catégorie (Éducation)
- [ ] Contenu cible (Tous publics)

---

## 🚀 Prochaines étapes

1. **Cette semaine** : Prendre les screenshots dans l'app
2. **Cette semaine** : Ajouter les device frames avec Shotsnapp
3. **Cette semaine** : Créer le Feature Graphic Android
4. **Semaine prochaine** : Copier-coller les descriptions dans les stores
5. **Semaine prochaine** : Soumettre pour review

---

## 💡 Astuces

### Pour de meilleurs screenshots :
- Utilise l'app en **mode clair** (plus lisible sur fond blanc)
- Assure-toi que les **textes sont lisibles**
- Montre les **fonctionnalités principales** (import, flashcards, quiz)
- Ajoute des **données réalistes** (pas de "Lorem ipsum")

### Pour la description :
- Commence par le **bénéfice principal** (transformez vos cours en flashcards)
- Utilise des **emojis** pour rendre ça visuel
- Mentionne les **cas d'usage** (PASS, LAS, PACES)
- Termine par un **call-to-action** clair

---

## 📚 Ressources utiles

- **Shotsnapp** : https://shotsnapp.com/ (Mockups gratuits)
- **MockUPhone** : https://mockuphone.com/ (Mockups gratuits)
- **Canva** : https://www.canva.com/ (Feature Graphic)
- **App Store Connect** : https://appstoreconnect.apple.com/
- **Google Play Console** : https://play.google.com/console/

---

**Besoin d'aide ?** Dis-moi où tu en es et je t'aide à avancer ! 🚀
