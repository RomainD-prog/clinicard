# Patch: Annale (mode concours) pour améliorer la génération (flashcards + QCM)

Ce patch ajoute la possibilité de joindre une **annale de concours (PDF, optionnelle)** lors de l'import d'un cours.

## Ce que ça fait
- **UI Import**: bouton pour sélectionner une annale PDF (optionnel) + possibilité de la retirer.
- **Options de génération**: switch "Activer le mode concours" (uniquement si une annale est sélectionnée) + niveau d'influence (faible/moyen/fort).
- **Backend**:
  - accepte un second fichier multipart `exam` (en plus de `file`).
  - extrait le texte de l'annale et produit un **blueprint abstrait** (sans verbatim) via OpenAI.
  - utilise ce blueprint pour guider le **style** des flashcards/QCM (formats, pièges, difficulté) tout en gardant le **contenu factuel** strictement issu du cours.

## Installation
1. Dézippe ce fichier.
2. Copie/écrase les fichiers dans la racine de ton projet `medflash` :
   - `app/import/index.tsx`
   - `app/import/options.tsx`
   - `src/services/api.ts`
   - `src/services/backendApi.ts`
   - `src/store/useAppStore.ts`
   - `src/types/models.ts`
   - `backend/src/index.js`
   - `backend/src/generate.js`

## Notes
- Le backend expose maintenant `/v1/jobs` avec `multipart/form-data` contenant:
  - `file` (cours)
  - `exam` (annale, optionnel)
  - champs `examGuided` et `examInfluence`
- Les warnings `expo-notifications` dans Expo Go sont normaux (SDK 53+).
