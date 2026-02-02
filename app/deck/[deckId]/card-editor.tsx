import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as repo from "../../../src/storage/repo";
import { useAppStore } from "../../../src/store/useAppStore";
import { useStitchTheme } from "../../../src/uiStitch/theme";

export default function CardEditorScreen() {
  const router = useRouter();
  const t = useStitchTheme();
  const insets = useSafeAreaInsets();
  const { deckId, cardId } = useLocalSearchParams<{ deckId: string; cardId?: string }>();

  const { refreshDecks } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");

  const isEdit = !!cardId;

  useEffect(() => {
    (async () => {
      try {
        if (!deckId) return;
        const deck = await repo.getDeck(deckId);
        if (!deck) {
          Alert.alert("Deck introuvable");
          router.back();
          return;
        }

        if (cardId) {
          const card = deck.cards.find((c) => c.id === cardId);
          if (!card) {
            Alert.alert("Carte introuvable");
            router.back();
            return;
          }
          setQ(card.question ?? "");
          setA(card.answer ?? "");
        } else {
          setQ("");
          setA("");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [deckId, cardId]);

  const canSave = useMemo(() => q.trim().length >= 5 && a.trim().length >= 1, [q, a]);

  async function onSave() {
    if (!deckId) return;
    if (!canSave) {
      Alert.alert("Champs incomplets", "La question doit être assez précise, et la réponse non vide.");
      return;
    }

    try {
      setLoading(true);
      if (isEdit && cardId) {
        await repo.updateDeckCard(deckId, cardId, {
          question: q.trim(),
          answer: a.trim(),
        });
      } else {
        await repo.addDeckCard(deckId, {
          question: q.trim(),
          answer: a.trim(),
        });
      }

      await refreshDecks();
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d’enregistrer la carte.");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!deckId || !cardId) return;

    Alert.alert(
      "Supprimer la carte",
      "Cette action est irréversible. Supprimer cette carte du deck ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await repo.deleteDeckCard(deckId, cardId);
              await refreshDecks();
              router.back();
            } catch (e: any) {
              Alert.alert("Erreur", e?.message ?? "Impossible de supprimer la carte.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header safe-area */}
        <View style={[styles.top, { paddingTop: Math.max(8, insets.top + 6) }]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={t.text} />
          </Pressable>

          <Text style={[styles.title, { color: t.text, fontFamily: t.font.display }]}>
            {isEdit ? "Modifier la carte" : "Nouvelle carte"}
          </Text>

          <View style={styles.actions}>
            {isEdit ? (
              <Pressable
                onPress={onDelete}
                disabled={loading}
                style={({ pressed }) => [
                  styles.trashBtn,
                  {
                    borderColor: t.border,
                    backgroundColor: t.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    opacity: loading ? 0.45 : pressed ? 0.75 : 1,
                  },
                ]}
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={18} color={t.text} />
              </Pressable>
            ) : null}

            <Pressable
              onPress={onSave}
              disabled={!canSave || loading}
              style={[styles.saveBtn, { backgroundColor: t.primary, opacity: !canSave || loading ? 0.45 : 1 }]}
            >
              <Text style={{ color: "#fff", fontFamily: t.font.display }}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>

        {/* Scroll + safe area bas */}
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: t.muted, fontFamily: t.font.semibold }]}>QUESTION</Text>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Ex: Quels sont les critères diagnostiques de… ?"
            placeholderTextColor={t.muted}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: t.dark ? "#1c2127" : "#fff",
                borderColor: t.border,
                color: t.text,
                fontFamily: t.font.body,
              },
            ]}
          />

          <Text style={[styles.label, { color: t.muted, fontFamily: t.font.semibold }]}>RÉPONSE</Text>
          <TextInput
            value={a}
            onChangeText={setA}
            placeholder="Réponse courte, précise, orientée concours."
            placeholderTextColor={t.muted}
            multiline
            style={[
              styles.input,
              {
                minHeight: 140,
                backgroundColor: t.dark ? "#1c2127" : "#fff",
                borderColor: t.border,
                color: t.text,
                fontFamily: t.font.body,
              },
            ]}
          />

          <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 12 }}>
            Astuce : une carte = 1 notion. Réponse “checklist” si possible.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: { width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 16 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: { height: 40, paddingHorizontal: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, letterSpacing: 1 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 12, minHeight: 90, textAlignVertical: "top" },
});
