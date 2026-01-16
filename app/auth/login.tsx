/**
 * Écran de Connexion
 * 
 * Permet à un utilisateur existant de se connecter avec email/password.
 * 
 * FONCTIONNEMENT :
 * - Formulaire simple avec email + password
 * - Validation basique (email valide, password non vide)
 * - Appelle authService.login() pour authentifier
 * - En cas de succès : redirige vers l'app principale
 * - En cas d'erreur : affiche un message d'erreur
 * 
 * IMPACT :
 * - L'utilisateur peut accéder à ses données depuis n'importe quel appareil
 * - La session est persistée localement (reste connecté)
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

export default function LoginScreen() {
  const router = useRouter();
  const { setAuthUser, syncUserData, refreshDecks, refreshReviewStats } = useAppStore();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Erreur", "Merci de remplir tous les champs");
      return;
    }

    setLoading(true);
    const { user, error } = await authService.login({ email: email.trim(), password });
    setLoading(false);

    if (error) {
      Alert.alert("Erreur de connexion", error);
      return;
    }

    if (user) {
      // ✅ Définir l'utilisateur authentifié comme utilisateur actuel
      await repo.setCurrentAuthUserId(user.id);
      setAuthUser(user);
      
      // ✅ Synchroniser et charger les données de cet utilisateur
      await syncUserData(user.id);
      await refreshDecks();
      await refreshReviewStats();
      
      router.replace("/(tabs)");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Email requis", "Entre ton email pour réinitialiser ton mot de passe");
      return;
    }

    const { error } = await authService.resetPassword(email.trim());
    if (error) {
      Alert.alert("Erreur", error);
    } else {
      Alert.alert("Email envoyé", "Vérifie ta boîte mail pour réinitialiser ton mot de passe");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Content de te revoir ! 👋</Text>
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
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
              <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <View style={{ height: 16 }} />

            {loading ? (
              <ActivityIndicator size="large" color="#4F46E5" />
            ) : (
              <>
                <PrimaryButton title="Se connecter" onPress={handleLogin} />
                <View style={{ height: 12 }} />
                <TouchableOpacity onPress={() => router.push("/auth/signup")}>
                  <Text style={styles.linkText}>
                    Pas encore de compte ? <Text style={styles.linkBold}>S'inscrire</Text>
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
  forgotLink: {
    color: "#4F46E5",
    fontSize: 14,
    textAlign: "right",
    marginTop: -4,
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
});

