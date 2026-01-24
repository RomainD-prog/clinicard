import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setRecoverySessionFromUrl, updatePasswordFromRecovery } from "../../src/services/authService";
import { useStitchTheme } from "../../src/uiStitch/theme";

type RecoveryTokens = {
  access_token?: string | null;
  refresh_token?: string | null;
  type?: string | null;
};

function extractRecoveryTokens(url: string): RecoveryTokens {
  // Supporte:
  // - medflash://auth/reset#access_token=...&refresh_token=...&type=recovery
  // - medflash://auth/reset?access_token=...&refresh_token=...&type=recovery
  // - (au cas où) mélange des deux
  const [beforeHash, hashPart = ""] = url.split("#");
  const queryPart = beforeHash.split("?")[1] ?? "";

  const query = new URLSearchParams(queryPart);
  const hash = new URLSearchParams(hashPart);

  const access_token = hash.get("access_token") ?? query.get("access_token");
  const refresh_token = hash.get("refresh_token") ?? query.get("refresh_token");
  const type = hash.get("type") ?? query.get("type");

  return { access_token, refresh_token, type };
}

function hasRecoveryTokens(url: string) {
  const t = extractRecoveryTokens(url);
  return !!(t.access_token && t.refresh_token);
}

export default function ResetPasswordScreen() {
  const t = useStitchTheme();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Important: on "lock" seulement quand on a réellement réussi à traiter un lien valide
  const handledValidLink = useRef(false);

  useEffect(() => {
    let alive = true;

    const failAndExit = (title: string, msg: string) => {
      if (!alive) return;
      Alert.alert(title, msg, [{ text: "OK", onPress: () => router.replace("/auth/login") }]);
    };

    const tryHandleUrl = async (incomingUrl: string | null | undefined) => {
      if (!alive) return;
      if (!incomingUrl) return false;
      if (handledValidLink.current) return true;

      // Si l'URL ne contient pas (encore) les tokens, on ne lock pas.
      // (ex: certaines pages web ouvrent l'app puis injectent le hash après)
      if (!hasRecoveryTokens(incomingUrl)) return false;

      try {
        const { error } = await setRecoverySessionFromUrl(incomingUrl);
        if (error) {
          failAndExit("Lien invalide", error);
          return true; // lien traité (même si invalide)
        }

        handledValidLink.current = true;
        if (alive) setReady(true);
        return true;
      } catch (e: any) {
        failAndExit("Erreur", e?.message ?? "Impossible de valider le lien.");
        return true;
      }
    };

    // 1) Essaye au démarrage (cold start)
    (async () => {
      const initial = await Linking.getInitialURL();
      const handled = await tryHandleUrl(initial);

      // Si pas de lien valide au démarrage, on attend un éventuel event "url"
      if (!handled) {
        // Petit timeout de sécurité: si rien n’arrive, on affiche le message
        setTimeout(() => {
          if (!alive) return;
          if (!handledValidLink.current) {
            failAndExit("Lien manquant", "Ouvre le lien de réinitialisation depuis l’email.");
          }
        }, 1500);
      }
    })();

    // 2) Essaye aussi via event (souvent nécessaire sur iOS)
    const sub = Linking.addEventListener("url", async ({ url }) => {
      await tryHandleUrl(url);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, [router]);

  const canSubmit = useMemo(() => {
    if (!password || password.length < 8) return false;
    if (password !== confirm) return false;
    return true;
  }, [password, confirm]);

  async function onSubmit() {
    if (!ready || !canSubmit || loading) return;

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
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
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
