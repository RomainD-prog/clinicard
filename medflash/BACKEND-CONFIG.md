# Configuration Backend

## 🔌 Port du backend

Le backend tourne sur le port **3333** : `http://0.0.0.0:3333`

## 📱 Configuration selon l'appareil

### **iOS Simulator** ✅
```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3333
```
Fonctionne car le simulator partage le network de ton Mac.

### **Android Emulator (Android Studio)** 🤖
```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3333
```
`10.0.2.2` est l'IP spéciale qui pointe vers `localhost` de l'hôte.

### **Téléphone physique** 📱
```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.X.X:3333
```
Remplace `192.168.X.X` par l'IP locale de ton Mac sur le réseau WiFi.

Pour trouver ton IP :
```bash
# Mac
ipconfig getifaddr en0

# Ou
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### **Production avec Cloudflare Tunnel** 🌐
```env
EXPO_PUBLIC_API_BASE_URL=https://ton-tunnel.trycloudflare.com
```
Ou avec un Named Tunnel stable.

## 🧪 Tester la connexion

```bash
# Test depuis ton Mac
curl http://localhost:3333/health

# Test depuis ton réseau local
curl http://192.168.X.X:3333/health
```

Réponse attendue :
```json
{"ok":true,"uptime":123.456}
```

## 🔄 Appliquer les changements

**Après modification du `.env`** :
1. Arrête Expo (`Ctrl+C`)
2. Relance avec cache vidé :
```bash
npx expo start --clear
```
3. Recharge l'app (secoue le téléphone → Reload, ou `r` dans le terminal)

## 🚀 État actuel

✅ Backend : `http://localhost:3333`  
✅ Configuration : `.env` → `EXPO_PUBLIC_API_BASE_URL=http://localhost:3333`  
✅ Logs activés dans le backend

## 🐛 Problèmes courants

### "Network request failed"
- ❌ Le backend n'est pas démarré → `cd backend && node src/index.js`
- ❌ Mauvaise IP/port dans `.env`
- ❌ Firewall bloque la connexion

### "Timeout error"
- ❌ Clé API OpenAI manquante dans `.env`
- ❌ Génération trop longue (vérifie les logs backend)
- ❌ Backend planté (vérifie le terminal backend)

### Pas de logs dans le backend
- ✅ Les logs sont maintenant activés !
- Tu devrais voir : `[POST /v1/jobs] Nouvelle génération reçue`

