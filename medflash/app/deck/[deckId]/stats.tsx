// app/deck/[deckId]/stats.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as repo from "../../../src/storage/repo";
import { useAppStore } from "../../../src/store/useAppStore";
import { useStitchTheme } from "../../../src/uiStitch/theme";
import { computeDeckStats } from "../../../src/utils/stats";

function Card({ children }: { children: React.ReactNode }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const t = useStitchTheme();
  return (
    <Text style={[styles.sectionTitle, { color: t.text, fontFamily: t.font.display }]}>
      {children}
    </Text>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  const t = useStitchTheme();
  return (
    <View style={styles.statRow}>
      <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 14 }}>{value}</Text>
    </View>
  );
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const t = useStitchTheme();
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={{ color: t.text, fontFamily: t.font.body, fontSize: 14 }}>{label}</Text>
        <Text style={{ color: t.muted, fontFamily: t.font.display, fontSize: 14 }}>
          {value}/{max}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: t.dark ? '#1c2127' : '#f3f4f6' }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(100, percentage)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function Divider() {
  const t = useStitchTheme();
  return <View style={[styles.sep, { backgroundColor: t.border }]} />;
}

function PrimaryButton({
  title,
  icon,
  onPress,
  disabled,
  style,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  style?: any;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: t.primary,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 16 }} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function DeckStatsScreen() {
  const router = useRouter();
  const t = useStitchTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ deckId: string }>();
  const deckId = String(params.deckId ?? "");

  const decks = useAppStore((s) => s.decks);
  const deck = useMemo(() => decks.find((d: any) => d.id === deckId), [decks, deckId]);

  // ✅ Vraies stats calculées depuis les review records
  const [stats, setStats] = useState({
    total: 0,
    duesNow: 0,
    newCards: 0,
    learned: 0,
    matured: 0,
    easeAvg: 0,
    attempts: 0,
    lastScore: null as null | number,
    bestScore: null as null | number,
  });

  useEffect(() => {
    (async () => {
      if (!deck) return;

      const reviews = await repo.listReviews();
      const quizAttempts = await repo.listAllQuizAttempts();
      const deckQuizAttempts = quizAttempts.filter((a) => a.deckId === deckId);

      const computed = computeDeckStats({
        deck,
        reviews,
        quizAttempts: deckQuizAttempts,
      });

      const lastQuiz = computed.lastQuiz;
      const bestQuiz = computed.bestQuiz;

      setStats({
        total: computed.totalCards,
        duesNow: computed.dueCards,
        newCards: computed.newCards,
        learned: computed.learnedCards,
        matured: computed.matureCards,
        easeAvg: computed.avgEase ?? 0,
        attempts: deckQuizAttempts.length,
        lastScore: lastQuiz ? Math.round((lastQuiz.correct / lastQuiz.total) * 100) : null,
        bestScore: bestQuiz ? Math.round((bestQuiz.correct / bestQuiz.total) * 100) : null,
      });
    })();
  }, [deck, deckId]);

  const { total, duesNow, newCards, learned, matured, easeAvg, attempts, lastScore, bestScore } = stats;

  function goBackSmart() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  function goSettings() {
    router.push("/(tabs)/settings");
  }

  // Routes (adapte si besoin)
  function startReview() {
    // si ta review route attend deckId en query:
    router.push(`/review/session?deckId=${encodeURIComponent(deckId)}`);
  }
  function openAllCards() {
    router.push(`/deck/${encodeURIComponent(deckId)}/cards`);
  }
  function startQuiz() {
    router.push(`/deck/${encodeURIComponent(deckId)}/quiz`);
  }
  function openQuizHistory() {
    router.push(`/deck/${encodeURIComponent(deckId)}/quiz-history`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      {/* ✅ on supprime le header Expo Router (c'est lui qui te met "(tabs)" et le doublon) */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* ✅ TopBar custom uniforme */}
      <View style={[styles.topBar, { paddingTop: Math.max(6, insets.top) }]}>
        <Pressable onPress={goBackSmart} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>

        <Text style={[styles.topTitle, { color: t.text, fontFamily: t.font.display }]} numberOfLines={1}>
          Stats
        </Text>

        <Pressable onPress={goSettings} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="settings-outline" size={20} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 24, marginBottom: 10 }}>
          Révision : {deck?.title ?? "Deck"}
        </Text>

        <SectionTitle>Cartes</SectionTitle>
        <Card>
          <View style={{ padding: 14 }}>
            <StatRow label="Total" value={String(total)} />
            <Divider />
            
            <ProgressRow 
              label="À réviser maintenant" 
              value={duesNow} 
              max={total} 
              color="#ef4444" 
            />
            <Divider />
            
            <ProgressRow 
              label="Nouvelles (jamais vues)" 
              value={newCards} 
              max={total} 
              color="#3b82f6" 
            />
            <Divider />
            
            <ProgressRow 
              label="Déjà revues (apprises)" 
              value={learned} 
              max={total} 
              color="#10b981" 
            />
            <Divider />
            
            <ProgressRow 
              label="Matures (≥21 jours)" 
              value={matured} 
              max={total} 
              color="#8b5cf6" 
            />
            <Divider />
            
            <StatRow label="Ease moyen" value={easeAvg > 0 ? String(easeAvg) : '—'} />
          </View>
        </Card>

        <SectionTitle>QCM</SectionTitle>
        <Card>
          <View style={{ padding: 14 }}>
            <StatRow label="Tentatives" value={String(attempts)} />
            <Divider />
            <StatRow label="Dernier score" value={lastScore === null ? "—" : `${lastScore}%`} />
            <Divider />
            <StatRow label="Meilleur score" value={bestScore === null ? "—" : `${bestScore}%`} />

            <View style={{ height: 14 }} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <PrimaryButton title="Faire un QCM" onPress={startQuiz} style={{ flex: 1 }} />
              <PrimaryButton title="Historique QCM" onPress={openQuizHistory} style={{ flex: 1 }} />
            </View>

            <View style={{ height: 12 }} />

            <PrimaryButton title="Retour" icon="arrow-back" onPress={goBackSmart} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
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

  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 6,
    fontSize: 18,
  },

  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },

  statRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },

  progressRow: {
    paddingVertical: 8,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 999,
  },

  sep: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    opacity: 0.9,
  },

  primaryBtn: {
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
  },
});
