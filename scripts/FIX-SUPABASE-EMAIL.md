# 🔧 Configuration Supabase - Email Verification

## Problème

Quand tu valides ton email, Supabase redirige vers `localhost` (Access Denied).

## Solution : Configurer l'URL de redirection

### Étape 1 : Va dans Supabase Dashboard

1. Ouvre https://supabase.com/dashboard
2. Sélectionne ton projet MedFlash
3. Va dans **Authentication** > **URL Configuration** (menu de gauche)

### Étape 2 : Configure les URLs de redirection

Dans **Site URL**, mets :
```
exp://localhost:8081
```

Dans **Redirect URLs**, ajoute :
```
exp://localhost:8081
exp://192.168.1.82:8081
http://localhost:8081
```

(Remplace `192.168.1.82` par ton IP locale si différente)

### Étape 3 : Désactive la confirmation email (optionnel pour dev)

Pour le **développement**, tu peux désactiver la confirmation email :

1. Va dans **Authentication** > **Providers** (menu de gauche)
2. Clique sur **Email**
3. Trouve **Confirm email** et **désactive-le**
4. Clique sur **Save**

Maintenant les nouveaux comptes seront actifs immédiatement ! ✅

---

## Alternative : Deep linking dans l'app

Si tu veux garder la confirmation email, configure le deep linking :

### Dans `app.json`

```json
{
  "expo": {
    "scheme": "medflash",
    "ios": {
      "bundleIdentifier": "com.yourname.medflash"
    },
    "android": {
      "package": "com.yourname.medflash"
    }
  }
}
```

### Dans Supabase

**Redirect URLs** :
```
medflash://
exp://localhost:8081
```

### Dans le code de signup

```typescript
const { data, error } = await supabase.auth.signUp({
  email: data.email,
  password: data.password,
  options: {
    emailRedirectTo: 'medflash://',
  }
});
```

---

## Recommandation pour dev

**Désactive la confirmation email** pour l'instant. Tu pourras la réactiver en production.

Avantages :
- ✅ Signup instantané
- ✅ Pas de soucis de redirection
- ✅ Meilleur pour le dev/test

Tu réactiveras ça plus tard en prod avec le vrai deep linking configuré.

