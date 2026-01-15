/**
 * Écran d'Inscription
 * 
 * Permet à un nouvel utilisateur de créer un compte avec email/password.
 * 
 * FONCTIONNEMENT :
 * - Formulaire avec email + password + confirmation
 * - Validation : email valide, password >= 6 caractères, passwords identiques
 * - Appelle authService.signup() pour créer le compte
 * - Upload automatiquement les données locales vers le cloud
 * - En cas de succès : redirige vers l'app principale
 * 
 * IMPACT :
 * - Les données locales sont migrées vers le cloud
 * - L'utilisateur peut maintenant accéder à ses cours depuis n'importe où
 * - Backup automatique de tous les decks et progrès
 */

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CardShell } from "../../src/components/CardShell";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import * as authService from "../../src/services/authService";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";

export default function SignupScreen() {
  const router = useRouter();
  const { setAuthUser, syncUserData, refreshDecks, refreshReviewStats } = useAppStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // Validation
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert("Erreur", "Merci de remplir tous les champs");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    const { user, error } = await authService.signup({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      Alert.alert("Erreur d'inscription", error);
      return;
    }

    if (user) {
      // ✅ Définir l'utilisateur authentifié comme utilisateur actuel
      await repo.setCurrentAuthUserId(user.id);
      setAuthUser(user);
      
      // ✅ Upload les données locales vers le cloud
      await syncUserData(user.id);
      await refreshDecks();
      await refreshReviewStats();
      
      Alert.alert(
        "Compte créé ! 🎉",
        "Tes données locales ont été sauvegardées dans le cloud. Tu peux maintenant y accéder depuis n'importe quel appareil.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Sauvegarde tes cours dans le cloud ☁️</Text>
        </View>

        <CardShell title="">
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="ton@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="Au moins 6 caractères"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>Confirme ton mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="Retape ton mot de passe"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <View style={{ height: 16 }} />

            {loading ? (
              <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
              <>
                <PrimaryButton title="Créer mon compte" onPress={handleSignup} />
                <View style={{ height: 12 }} />
                <TouchableOpacity onPress={() => router.push("/auth/login")}>
                  <Text style={styles.linkText}>
                    Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text>
                  </Text>
                </TouchableOpacity>
                <View style={{ height: 12 }} />
                <TouchableOpacity onPress={() => router.back()}>
                  <Text style={styles.linkText}>Retour</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </CardShell>

        <View style={styles.info}>
          <Text style={styles.infoText}>
            💡 En créant un compte, tes cours et ton progrès seront sauvegardés dans le cloud.
            Tu pourras y accéder depuis n'importe quel appareil.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  form: {
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: -8,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  linkText: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
  },
  linkBold: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  info: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#4338CA",
    lineHeight: 18,
  },
});

