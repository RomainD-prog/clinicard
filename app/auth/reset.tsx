import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setRecoverySessionFromUrl, updatePasswordFromRecovery } from "../../src/services/authService";
import { supabase } from "../../src/services/supabaseClient";
import { useStitchTheme } from "../../src/uiStitch/theme";

export default function ResetPasswordScreen() {
  const t = useStitchTheme();
  const router = useRouter();
  const globalParams = useGlobalSearchParams();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // évite double traitement
  const handledUrlRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    let alive = true;

    async function handleUrl(url: string) {
      if (!alive || processingRef.current) return;
      processingRef.current = true;

      // évite retrigger
      if (handledUrlRef.current === url) {
        processingRef.current = false;
        return;
      }
      handledUrlRef.current = url;

      console.log("[Reset] Traitement de l'URL:", url.substring(0, 150));
      const { error } = await setRecoverySessionFromUrl(url);

      if (!alive) {
        processingRef.current = false;
        return;
      }

      if (error) {
        console.error("[Reset] Erreur lors du traitement:", error);
        processingRef.current = false;
        Alert.alert("Lien invalide", error, [{ text: "OK", onPress: () => router.replace("/auth/login") }]);
        return;
      }

      console.log("[Reset] Lien validé avec succès, ready = true");
      setReady(true);
      processingRef.current = false;
    }

    async function tryToGetUrl() {
      console.log("[Reset] Démarrage de l'écran de réinitialisation");
      console.log("[Reset] Paramètres globaux:", JSON.stringify(globalParams));
      
      // 0) Vérifier d'abord si on a déjà une session de récupération valide
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("[Reset] Vérification de session:", session ? "Session présente" : "Aucune session");
        if (session?.user) {
          console.log("[Reset] Session déjà présente, ready = true");
          setReady(true);
          return;
        }
      } catch (err) {
        console.error("[Reset] Erreur lors de la vérification de session:", err);
      }

      // 1) Essayer de construire l'URL à partir des paramètres globaux
      // Si expo-router a passé les paramètres, on peut les utiliser
      const code = globalParams.code as string | undefined;
      const type = globalParams.type as string | undefined;
      const access_token = globalParams.access_token as string | undefined;
      const refresh_token = globalParams.refresh_token as string | undefined;
      
      if (code || (access_token && refresh_token)) {
        console.log("[Reset] Paramètres trouvés dans globalParams, construction de l'URL");
        const baseUrl = "medflash://auth/reset";
        const params = new URLSearchParams();
        if (code) params.set("code", code);
        if (type) params.set("type", type);
        if (access_token) params.set("access_token", access_token);
        if (refresh_token) params.set("refresh_token", refresh_token);
        const constructedUrl = `${baseUrl}?${params.toString()}`;
        console.log("[Reset] URL construite:", constructedUrl.substring(0, 150));
        await handleUrl(constructedUrl);
        return;
      }

      // 2) Si l'app est ouverte via le lien (getInitialURL)
      const initial = await Linking.getInitialURL();
      console.log("[Reset] URL initiale:", initial || "Aucune URL initiale");
      
      if (initial && (initial.includes("auth/reset") || initial.includes("reset"))) {
        console.log("[Reset] Lien de réinitialisation détecté dans l'URL initiale");
        await handleUrl(initial);
        return;
      }

      // 3) Si l'app est déjà ouverte quand le lien arrive (listener)
      console.log("[Reset] Configuration du listener pour les URLs");
      const sub = Linking.addEventListener("url", ({ url }) => {
        console.log("[Reset] URL reçue via listener:", url);
        if (url && (url.includes("auth/reset") || url.includes("reset"))) {
          console.log("[Reset] Lien de réinitialisation détecté via listener");
          handleUrl(url);
        }
      });

      return () => sub.remove();
    }

    tryToGetUrl();

    return () => {
      alive = false;
    };
  }, [router, globalParams]);

  const canSubmit = useMemo(() => {
    if (!password || password.length < 8) return false;
    if (password !== confirm) return false;
    return true;
  }, [password, confirm]);

  async function onSubmit() {
    if (!ready) {
      Alert.alert("Lien manquant", "Ouvre le lien de réinitialisation depuis l’email.");
      return;
    }
    if (!canSubmit || loading) return;

    setLoading(true);
    try {
      const { error } = await updatePasswordFromRecovery(password);
      if (error) {
        Alert.alert("Erreur", error);
        return;
      }

      Alert.alert("Mot de passe modifié", "Tu peux maintenant te reconnecter.", [
        { text: "OK", onPress: () => router.replace("/auth/login") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </Pressable>
        <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>
          Nouveau mot de passe
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 13, lineHeight: 18 }}>
          Choisis un nouveau mot de passe (8 caractères minimum).
        </Text>

        <Text style={[styles.label, { color: t.muted, fontFamily: t.font.medium }]}>Mot de passe</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="********"
          placeholderTextColor={t.muted}
          style={[styles.input, { borderColor: t.border, color: t.text, fontFamily: t.font.body }]}
        />

        <Text style={[styles.label, { color: t.muted, fontFamily: t.font.medium }]}>Confirmer</Text>
        <TextInput
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          placeholder="********"
          placeholderTextColor={t.muted}
          style={[styles.input, { borderColor: t.border, color: t.text, fontFamily: t.font.body }]}
        />

        <Pressable
          onPress={onSubmit}
          disabled={!ready || !canSubmit || loading}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: t.primary,
              opacity: !ready || !canSubmit || loading ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 15 }}>
            {loading ? "En cours..." : "Mettre à jour"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18 },
  header: {
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  label: { marginTop: 14, marginBottom: 8, fontSize: 12, letterSpacing: 0.2 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primary: {
    marginTop: 18,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
