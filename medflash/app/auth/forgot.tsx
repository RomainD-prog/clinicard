import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestPasswordReset } from "../../src/services/authService";
import { useStitchTheme } from "../../src/uiStitch/theme";

export default function ForgotPasswordScreen() {
  const t = useStitchTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSend() {
    const e = email.trim();
    if (!e) {
      Alert.alert("Email requis", "Entre ton email pour recevoir un lien de réinitialisation.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await requestPasswordReset(e);
      if (error) {
        Alert.alert("Erreur", error);
        return;
      }

      Alert.alert(
        "Email envoyé",
        "Regarde ta boîte mail (et les spams). Ouvre le lien sur ton téléphone : il te ramènera dans l'app pour choisir un nouveau mot de passe.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
          Mot de passe oublié
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ padding: 18, gap: 14 }}>
        <Text style={{ color: t.muted, fontFamily: t.font.body, lineHeight: 20 }}>
          Entre ton email. On t'enverra un lien pour réinitialiser ton mot de passe.
        </Text>

        <View style={[styles.inputWrap, { backgroundColor: t.card, borderColor: t.border }]}>
          <Ionicons name="mail-outline" size={18} color={t.muted} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 15 }}
          />
        </View>

        <Pressable
          onPress={onSend}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: t.primary,
              opacity: loading ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 16 }}>
            {loading ? "Envoi..." : "Envoyer le lien"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
