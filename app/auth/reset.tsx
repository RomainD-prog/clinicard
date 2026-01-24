import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { completePasswordRecoveryFromUrl, setNewPassword } from "../../src/services/authService";
import { useStitchTheme } from "../../src/uiStitch/theme";

export default function ResetPasswordScreen() {
  const t = useStitchTheme();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const url = Linking.useURL();

  // On peut arriver ici via un deep link (expo go = exp://.../--/auth/reset#..., prod = medflash://auth/reset#...)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const initial = url ?? (await Linking.getInitialURL());
        const { error } = await completePasswordRecoveryFromUrl(initial);
        if (error) {
          // Souvent : lien expiré / déjà utilisé
          Alert.alert(
            "Lien invalide",
            error,
            [{ text: "OK", onPress: () => router.replace("/auth/login") }]
          );
          return;
        }
      } catch (e: any) {
        Alert.alert(
          "Erreur",
          e?.message ?? "Impossible de valider le lien de réinitialisation.",
          [{ text: "OK", onPress: () => router.replace("/auth/login") }]
        );
        return;
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router, url]);

  const canSubmit = useMemo(() => {
    if (!password || password.length < 8) return false;
    if (password !== confirm) return false;
    return true;
  }, [password, confirm]);

  async function onSubmit() {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const { error } = await setNewPassword(password);
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
        <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </Pressable>
        <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>Nouveau mot de passe</Text>
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
