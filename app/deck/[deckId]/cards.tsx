// app/deck/[deckId]/cards.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoadingBlock } from "../../../src/components/LoadingBlock";
import * as repo from "../../../src/storage/repo";
import { Deck } from "../../../src/types/models";
import { useStitchTheme } from "../../../src/uiStitch/theme";

export default function DeckCardsScreen() {
  const router = useRouter();
  const t = useStitchTheme();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [onlyDue, setOnlyDue] = useState(false);
  const [dueSet, setDueSet] = useState<Set<string>>(new Set());

  async function refresh() {
    if (!deckId) return;
    const d = await repo.getDeck(deckId);
    setDeck(d);

    if (d) {
      const dueIds = await repo.dueCardsForDeck(d);
      setDueSet(new Set(dueIds));
    }
  }

  useEffect(() => {
    refresh();
  }, [deckId]);

  const filtered = useMemo(() => {
    if (!deck) return [];
    const q = query.trim().toLowerCase();

    return deck.cards.filter((c) => {
      if (onlyDue && !dueSet.has(c.id)) return false;
      if (!q) return true;
      return (
        c.question.toLowerCase().includes(q) ||
        c.answer.toLowerCase().includes(q) ||
        (c.sourceSnippet ?? "").toLowerCase().includes(q)
      );
    });
  }, [deck, query, onlyDue, dueSet]);

  async function deleteCard(cardId: string) {
    if (!deck) return;

    Alert.alert(
      "Supprimer la carte",
      "Es-tu sûr de vouloir supprimer cette carte ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const updatedCards = deck.cards.filter((c) => c.id !== cardId);
            const updatedDeck = { ...deck, cards: updatedCards };
            await repo.saveDeck(updatedDeck);
            setDeck(updatedDeck);
          },
        },
      ]
    );
  }

  if (!deck) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: 16 }}>
        <LoadingBlock label="Chargement des cartes…" />
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.bg }]} edges={['top']}>
      {/* header simple */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>

        <Text style={[styles.h1, { color: t.text, fontFamily: t.font.display }]} numberOfLines={1}>
          Cartes
        </Text>

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/deck/[deckId]/card-editor",
              params: { deckId: deck.id },
            })
          }
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.75 : 1 }]}
          hitSlop={10}
        >
          <Ionicons name="add" size={22} color={t.text} />
        </Pressable>
      </View>

      <Text style={{ color: t.muted, fontFamily: t.font.body, marginBottom: 10 }} numberOfLines={1}>
        {deck.title}
      </Text>

      <View style={[styles.searchWrap, { borderColor: t.border, backgroundColor: t.dark ? "#161a20" : "#fff" }]}>
        <Ionicons name="search" size={18} color={t.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher (question / réponse / extrait)…"
          placeholderTextColor={t.muted}
          style={{ flex: 1, color: t.text, fontFamily: t.font.body }}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={() => setOnlyDue((v) => !v)}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: onlyDue ? t.primary : (t.dark ? "#283039" : "#EEF2FF"),
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: onlyDue ? "#fff" : t.text, fontFamily: t.font.display }}>
            {onlyDue ? "✅ À réviser uniquement" : "À réviser uniquement"}
          </Text>
        </Pressable>

        <Text style={{ color: t.muted, fontFamily: t.font.display }}>
          {filtered.length}/{deck.cards.length}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          const due = dueSet.has(item.id);

          const renderRightActions = () => (
            <Pressable
              onPress={() => deleteCard(item.id)}
              style={[
                styles.deleteAction,
                { backgroundColor: "#ef4444" },
              ]}
            >
              <Ionicons name="trash-outline" size={24} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: t.font.semibold, fontSize: 12 }}>
                Supprimer
              </Text>
            </Pressable>
          );

          return (
            <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
            <Pressable
              onPress={() => setExpandedId(expanded ? null : item.id)}
              style={[
                styles.card,
                { backgroundColor: t.card, borderColor: due ? t.text : t.border },
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={{ flex: 1, color: t.text, fontFamily: t.font.display }} numberOfLines={expanded ? 50 : 3}>
                  {item.question}
                </Text>
              </View>

              {expanded ? (
                <>
                  <Text style={{ color: t.muted, fontFamily: t.font.body, lineHeight: 20 }}>{item.answer}</Text>

                  <View style={{ height: 10 }} />

                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/deck/[deckId]/card-editor",
                        params: { deckId: deck.id, cardId: item.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.editBtn,
                      { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: t.font.display }}>Modifier</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 12 }}>
                    Appuie pour voir la réponse • Glisse vers la gauche pour supprimer
                </Text>
              )}
            </Pressable>
            </Swipeable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  h1: { flex: 1, fontSize: 16, textAlign: "center" },

  searchWrap: {
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pill: { height: 44, borderRadius: 14, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },

  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "flex-start" },

  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    marginLeft: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
  },

  smallBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },

  editBtn: {
    height: 44,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
