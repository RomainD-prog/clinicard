import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { setNewPassword } from "../../src/services/authService";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (pwd.length < 6) return Alert.alert("Mot de passe", "Minimum 6 caractères.");
    if (pwd !== pwd2) return Alert.alert("Mot de passe", "Les deux mots de passe ne correspondent pas.");

    setLoading(true);
    const { error } = await setNewPassword(pwd);
    setLoading(false);

    if (error) return Alert.alert("Erreur", error);

    Alert.alert("OK", "Mot de passe modifié. Tu peux te connecter.", [
      { text: "OK", onPress: () => router.replace("/auth/login") },
    ]);
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Nouveau mot de passe</Text>

      <TextInput
        placeholder="Nouveau mot de passe"
        secureTextEntry
        value={pwd}
        onChangeText={setPwd}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 10 }}
      />

      <TextInput
        placeholder="Confirmer"
        secureTextEntry
        value={pwd2}
        onChangeText={setPwd2}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, borderRadius: 10 }}
      />

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        style={{
          marginTop: 10,
          backgroundColor: "#2563EB",
          padding: 14,
          borderRadius: 12,
          opacity: loading ? 0.7 : 1,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>
          {loading ? "..." : "Valider"}
        </Text>
      </Pressable>
    </View>
  );
}
