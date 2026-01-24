Patch "recommandations" pour MedFlash / CliniCard

Contenu:
- app/_layout.tsx : corrige les noms de routes expo-router (ex: "import" au lieu de "import/index")
- src/services/authService.ts : évite le crash Supabase "Auth session missing" au démarrage (getCurrentUser)

Comment appliquer:
1) Dézippe l'archive.
2) Copie/colle les fichiers en respectant les chemins dans ton projet (écrase ceux existants).
3) Ensuite, fais un clean et rebuild Android:
   - rm -rf node_modules && npm i (ou pnpm i)
   - npx expo prebuild --clean (si tu es en dev client)
   - cd android && ./gradlew clean
   - relance le build AAB/APK.

Si tu utilises EAS:
- eas build -p android --clear-cache
