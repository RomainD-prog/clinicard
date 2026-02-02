import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setRecoverySessionFromUrl, updatePasswordFromRecovery } from "../../src/services/authService";
import { useStitchTheme } from "../../src/uiStitch/theme";

export default function ResetPasswordScreen() {
  const t = useStitchTheme();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // évite double traitement
  const handledUrlRef = useRef<string | null>(null);
  // fallback
  const gotLinkRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;

    async function handleUrl(url: string) {
      if (!alive) return;

      // dès qu’on reçoit une URL, on annule le fallback
      gotLinkRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // évite retrigger
      if (handledUrlRef.current === url) return;
      handledUrlRef.current = url;

      const { error } = await setRecoverySessionFromUrl(url);

      if (!alive) return;

      if (error) {
        Alert.alert("Lien invalide", error, [{ text: "OK", onPress: () => router.replace("/auth/login") }]);
        return;
      }

      setReady(true);
    }

    (async () => {
      // 1) Si l’app est ouverte via le lien
      const initial = await Linking.getInitialURL();
      if (initial) {
        await handleUrl(initial);
      }

      // 2) Si l’app est déjà ouverte quand le lien arrive
      const sub = Linking.addEventListener("url", ({ url }) => {
        handleUrl(url);
      });

      // 3) fallback (seulement si aucun lien n’arrive)
      timeoutRef.current = setTimeout(() => {
        if (!alive) return;
        if (gotLinkRef.current) return;

        Alert.alert("Lien manquant", "Ouvre le lien de réinitialisation depuis l’email.", [
          { text: "OK", onPress: () => router.replace("/auth/login") },
        ]);
      }, 8000);

      return () => sub.remove();
    })();

    return () => {
      alive = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router]);

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
