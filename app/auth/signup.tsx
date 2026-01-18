import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import * as authService from "../../src/services/authService";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { TopBar } from "../../src/uiStitch/TopBar";
import { useStitchTheme } from "../../src/uiStitch/theme";

export default function SignupScreen() {
  const router = useRouter();
  const t = useStitchTheme();
  const { setAuthUser, syncUserData } = useAppStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    const e = email.trim();
    return fn.length >= 2 && ln.length >= 2 && e.includes("@") && password.length >= 6;
  }, [firstName, lastName, email, password]);

  async function onSignup() {
    if (!canSubmit || loading) return;

    try {
      setLoading(true);

      const { user, error } = await authService.signup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });

      if (error || !user) {
        Alert.alert("Inscription impossible", error ?? "Réessaie dans un instant.");
        return;
      }

      await repo.setCurrentAuthUserId(user.id);
      setAuthUser(user);
      await syncUserData(user.id);

      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer le compte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Créer un compte" variant="small" showBack onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <View style={[styles.heroIcon, { backgroundColor: "rgba(19,127,236,0.12)" }]}>
                <Ionicons name="person-add-outline" size={20} color={t.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Bienvenue 👋</Text>
                <Text style={{ marginTop: 4, color: t.muted, fontFamily: t.font.body }}>
                  On a besoin de ton nom/prénom pour personnaliser ton espace (initiales, etc.).
                </Text>
              </View>
            </View>

            <View style={{ height: 14 }} />

            <Text style={[styles.label, { color: t.muted, fontFamily: t.font.semibold }]}>PRÉNOM</Text>
            <View style={[styles.inputWrap, { backgroundColor: t.dark ? "#161a20" : "#F8FAFC", borderColor: t.border }]}>
              <Ionicons name="person-outline" size={18} color={t.muted} />
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                placeholderTextColor={t.muted}
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 15 }}
              />
            </View>

            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: t.muted, fontFamily: t.font.semibold }]}>NOM</Text>
            <View style={[styles.inputWrap, { backgroundColor: t.dark ? "#161a20" : "#F8FAFC", borderColor: t.border }]}>
              <Ionicons name="person-outline" size={18} color={t.muted} />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor={t.muted}
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 15 }}
              />
            </View>

            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: t.muted, fontFamily: t.font.semibold }]}>EMAIL</Text>
            <View style={[styles.inputWrap, { backgroundColor: t.dark ? "#161a20" : "#F8FAFC", borderColor: t.border }]}>
              <Ionicons name="mail-outline" size={18} color={t.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="toi@exemple.com"
                placeholderTextColor={t.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 15 }}
              />
            </View>

            <View style={{ height: 12 }} />

            <Text style={[styles.label, { color: t.muted, fontFamily: t.font.semibold }]}>MOT DE PASSE</Text>
            <View style={[styles.inputWrap, { backgroundColor: t.dark ? "#161a20" : "#F8FAFC", borderColor: t.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={t.muted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="6 caractères minimum"
                placeholderTextColor={t.muted}
                secureTextEntry
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 15 }}
              />
            </View>

            <Pressable
              onPress={onSignup}
              disabled={!canSubmit || loading}
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: t.primary, opacity: !canSubmit || loading ? 0.45 : pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 16 }}>
                {loading ? "Création…" : "Créer le compte"}
              </Text>
              <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
            </Pressable>
          </View>

          <View style={{ marginTop: 14, alignItems: "center", gap: 6 }}>
            <Text style={{ color: t.muted, fontFamily: t.font.body }}>Déjà un compte ?</Text>
            <Text onPress={() => router.replace("/auth/login")} style={{ color: t.primary, fontFamily: t.font.semibold }}>
              Se connecter
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 12, letterSpacing: 1, marginLeft: 2 },
  inputWrap: {
    marginTop: 8,
    height: 52,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cta: {
    marginTop: 16,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});
