import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { Deck } from "../../src/types/models";
import { useStitchTheme } from "../../src/uiStitch/theme";
import { deckToAnkiTSV, deckToJSON } from "../../src/utils/exportDeck";
import { computeDeckStats, pct } from "../../src/utils/stats";

type DeckComputed = {
  due: number;
  learnedPct: number; // 0..100
};

function ProgressBar({ value01 }: { value01: number }) {
  const t = useStitchTheme();
  const v = Math.max(0, Math.min(1, value01));
  return (
    <View style={[styles.progressTrack, { backgroundColor: t.dark ? "#2a3440" : "#EEF2F7" }]}>
      <View style={[styles.progressFill, { width: `${v * 100}%`, backgroundColor: t.primary }]} />
    </View>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  const t = useStitchTheme();
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: t.dark ? "#1c2127" : "#fff", borderColor: t.dark ? "#2a3440" : "#E5E7EB" },
      ]}
    >
      <Text style={{ color: t.muted, fontFamily: t.font.semibold, fontSize: 11, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function Chip({ text }: { text: string }) {
  const t = useStitchTheme();
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: t.dark ? "#283039" : "#EEF2FF", borderColor: t.dark ? "#3a4451" : "#dce1f1" },
      ]}
    >
      <Text style={{ color: t.dark ? "#CBD5E1" : "#334155", fontFamily: t.font.medium, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

async function shareOrCopy(path: string, fallbackText: string, title: string) {
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, { dialogTitle: title });
  } else {
    await Clipboard.setStringAsync(fallbackText);
    Alert.alert("Partage indisponible", "Le contenu a été copié dans le presse-papiers.");
  }
}

export default function DeckScreen() {
  const t = useStitchTheme();
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [computed, setComputed] = useState<DeckComputed | null>(null);

  const { refreshDecks } = useAppStore();

  useEffect(() => {
    (async () => {
      if (!deckId) return;

      const d = await repo.getDeck(deckId);
      setDeck(d);

      if (!d) {
        setComputed(null);
        return;
      }

      const dueIds = await repo.dueCardsForDeck(d);
      const reviews = await repo.listReviews();
      const allAttempts = await repo.listAllQuizAttempts();
      const attempts = allAttempts.filter((a) => a.deckId === d.id);

      const s = computeDeckStats({ deck: d, reviews, quizAttempts: attempts });

      setComputed({
        due: dueIds.length,
        learnedPct: pct(s.learnedCards, s.totalCards),
      });
    })();
  }, [deckId]);

  const subjectLabel = useMemo(() => {
    const s = deck?.subject?.trim();
    return s ? s : "Sans matière";
  }, [deck]);

  async function exportAnki() {
    if (!deck) return;
    try {
      const tsv = deckToAnkiTSV(deck);
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!dir) throw new Error("Filesystem indisponible");
      const path = `${dir}medflash_${deck.id}.tsv`;
      await FileSystem.writeAsStringAsync(path, tsv);
      await shareOrCopy(path, tsv, "Exporter vers Anki (TSV)");
    } catch (e: any) {
      Alert.alert("Erreur export", e?.message ?? "Erreur inconnue");
    }
  }

  async function exportJson() {
    if (!deck) return;
    try {
      const json = deckToJSON(deck);
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!dir) throw new Error("Filesystem indisponible");
      const path = `${dir}medflash_${deck.id}.json`;
      await FileSystem.writeAsStringAsync(path, json);
      await shareOrCopy(path, json, "Exporter JSON");
    } catch (e: any) {
      Alert.alert("Erreur export", e?.message ?? "Erreur inconnue");
    }
  }

  function confirmDelete() {
    if (!deck) return;
    Alert.alert("Supprimer", "Supprimer ce deck et ses révisions ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          await repo.deleteDeck(deck.id);
          await refreshDecks();
          router.back();
        },
      },
    ]);
  }

  function renameDeck() {
    if (!deck) return;
    Alert.prompt(
      "Renommer le deck",
      "Nouveau nom :",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Renommer",
          onPress: async (newTitle?: string) => {
            if (!newTitle || !newTitle.trim()) return;
            const updated = { ...deck, title: newTitle.trim() };
            await repo.saveDeck(updated);
            await refreshDecks();
            setDeck(updated);
          },
        },
      ],
      "plain-text",
      deck.title
    );
  }

  function openMenu() {
    if (!deck) return;
    Alert.alert("Actions", deck.title ?? "", [
      { text: "Renommer le deck", onPress: renameDeck },
      { text: "Voir l'historique QCM", onPress: () => router.push(`/deck/${deck.id}/quiz-history`) },
      { text: "Exporter Anki (TSV)", onPress: exportAnki },
      { text: "Exporter JSON", onPress: exportJson },
      { text: "Supprimer le deck", style: "destructive", onPress: confirmDelete },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  if (!deck || !computed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: t.muted, fontFamily: t.font.body }}>Chargement…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const due = computed.due;
  const mastery = computed.learnedPct; // 0..100
  const atJour = Math.max(0, deck.cards.length - due);

  const canReview = due > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>

        <Text style={[styles.topTitle, { color: t.text, fontFamily: t.font.display }]} numberOfLines={1}>
          Cours
        </Text>

        <Pressable onPress={openMenu} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="ellipsis-horizontal" size={22} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View
            style={[
              styles.heroCard,
              { backgroundColor: t.dark ? "#1c2127" : "#fff", borderColor: t.dark ? "#2a3440" : "#E5E7EB" },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <Chip text={subjectLabel} />
                  <View style={[styles.levelChip, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]}>
                    <Text style={{ color: t.dark ? "#CBD5E1" : "#334155", fontFamily: t.font.medium, fontSize: 12 }}>
                      {deck.level}
                    </Text>
                  </View>
                </View>

                <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }} numberOfLines={2}>
                  {deck.title}
                </Text>
                <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
                  {deck.cards.length} cartes • {deck.mcqs.length} QCM • {due} à réviser
                </Text>
              </View>

              <View style={[styles.trophy, { backgroundColor: "rgba(249,115,22,0.12)" }]}>
                <Ionicons name="trophy-outline" size={24} color={t.dark ? "#fdba74" : "#ea580c"} />
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={{ color: t.muted, fontFamily: t.font.semibold, fontSize: 12, letterSpacing: 1 }}>
                MAÎTRISE
              </Text>
              <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
                <ProgressBar value01={mastery / 100} />
                <Text style={{ color: t.text, fontFamily: t.font.display, width: 48, textAlign: "right" }}>
                  {mastery}%
                </Text>
              </View>
              <Text style={{ marginTop: 8, color: t.muted, fontFamily: t.font.body }}>
                {atJour} à jour • {due} à revoir
              </Text>
            </View>
          </View>
        </View>

        {/* Stats pills */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", gap: 10 }}>
          <Pill label="À réviser" value={`${due}`} />
          <Pill label="Cartes" value={`${deck.cards.length}`} />
          <Pill label="QCM" value={`${deck.mcqs.length}`} />
        </View>

        {/* Main CTAs */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <Pressable
            onPress={() => router.push(`/review/session?deckId=${deck.id}`)}
            disabled={!canReview}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: t.primary,
                opacity: !canReview ? 0.45 : pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="play-circle-outline" size={20} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 16 }}>
              {canReview ? "Démarrer la révision" : "À jour ✅"}
            </Text>
          </Pressable>

          <View style={{ height: 10 }} />

          {/* ✅ boutons clairement cliquables + chevron */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => router.push(`/deck/${deck.id}/quiz`)}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: t.dark ? "#1c2127" : "#fff",
                  borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              {/* ✅ icône QCM (plus “assistance”) */}
              <Ionicons name="list-circle-outline" size={20} color={t.text} />
              <Text style={{ flex: 1, color: t.text, fontFamily: t.font.display, fontSize: 15 }}>QCM</Text>
              <Ionicons name="chevron-forward" size={18} color={t.muted} />
            </Pressable>

            <Pressable
              onPress={() => router.push(`/deck/${deck.id}/stats`)}
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: t.dark ? "#1c2127" : "#fff",
                  borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Ionicons name="bar-chart-outline" size={20} color={t.text} />
              <Text style={{ flex: 1, color: t.text, fontFamily: t.font.display, fontSize: 15 }}>Stats</Text>
              <Ionicons name="chevron-forward" size={18} color={t.muted} />
            </Pressable>
          </View>
        </View>

        {/* Secondary actions */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View
            style={[
              styles.section,
              { backgroundColor: t.dark ? "#1c2127" : "#fff", borderColor: t.dark ? "#2a3440" : "#E5E7EB" },
            ]}
          >
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Contenu</Text>
            <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
              Parcourir les cartes et ton plan.
            </Text>

            <View style={{ height: 12 }} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => router.push(`/deck/${deck.id}/cards`)}
                style={({ pressed }) => [
                  styles.smallBtn,
                  {
                    backgroundColor: t.dark ? "#283039" : "#EEF2FF",
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Ionicons name="albums-outline" size={18} color={t.dark ? "#E6EDF5" : "#1D4ED8"} />
                <Text style={{ color: t.dark ? "#E6EDF5" : "#1D4ED8", fontFamily: t.font.display }}>
                  Cartes
                </Text>
                <Ionicons name="chevron-forward" size={16} color={t.dark ? "#E6EDF5" : "#1D4ED8"} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Plan 7j */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
          <View
            style={[
              styles.section,
              { backgroundColor: t.dark ? "#1c2127" : "#fff", borderColor: t.dark ? "#2a3440" : "#E5E7EB" },
            ]}
          >
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Plan 7 jours</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {deck.plan7d?.slice(0, 7).map((line, idx) => (
                <Text key={idx} style={{ color: t.muted, fontFamily: t.font.body }}>
                  • {line}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { flex: 1, textAlign: "center", fontSize: 16 },

  heroCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  chip: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  levelChip: {
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trophy: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  progressTrack: {
    height: 10,
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  pill: {
    flex: 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },

  primaryBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  // ✅ boutons de navigation (QCM/Stats)
  navBtn: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    gap: 10,
  },

  section: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  smallBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    gap: 8,
  },
});
