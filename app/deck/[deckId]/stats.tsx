import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as repo from "../../../src/storage/repo";
import { useAppStore } from "../../../src/store/useAppStore";
import { useStitchTheme } from "../../../src/uiStitch/theme";
import { computeDeckStats, pct } from "../../../src/utils/stats";

type UIStats = {
  total: number;
  learned: number;
  newCards: number;
  dueNow: number;
  mature: number;
  easeAvg: number | null;
  attempts: number;
  lastScore: number | null;
  bestScore: number | null;
};

function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function CardShell({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  const t = useStitchTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

function StatTile({
  label,
  value,
  icon,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  highlight?: boolean;
}) {
  const t = useStitchTheme();

  // Emphasis styling (used to highlight "À réviser")
  const emphasizedBg = t.dark ? "rgba(239,68,68,0.14)" : "rgba(239,68,68,0.10)";
  const emphasizedBorder = accent;
  const emphasizedBorderWidth = 2;

  return (
    <View
      style={[
        styles.tile,
        {
          backgroundColor: highlight ? emphasizedBg : t.card,
          borderColor: highlight ? emphasizedBorder : t.border,
          borderWidth: highlight ? emphasizedBorderWidth : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.tileTop}>
        <View
          style={[
            styles.tileIcon,
            {
              backgroundColor: highlight
                ? t.dark
                  ? "rgba(239,68,68,0.20)"
                  : "rgba(239,68,68,0.14)"
                : t.dark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
            },
          ]}
        >
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text
          style={[
            styles.tileLabel,
            { color: highlight ? accent : t.muted, fontFamily: t.font.semibold },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </View>

      <Text
        style={[
          styles.tileValue,
          { color: highlight ? accent : t.text, fontFamily: t.font.display },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export default function DeckStatsScreen() {
  const t = useStitchTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const deck = useAppStore((s: any) => (deckId ? s.decks?.find((d: any) => d.id === deckId) : null));

  const [stats, setStats] = useState<UIStats>({
    total: 0,
    learned: 0,
    newCards: 0,
    dueNow: 0,
    mature: 0,
    easeAvg: null,
    attempts: 0,
    lastScore: null,
    bestScore: null,
  });

  useEffect(() => {
    (async () => {
      if (!deck || !deckId) return;

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
        learned: computed.learnedCards,
        newCards: computed.newCards,
        dueNow: computed.dueCards,
        mature: computed.matureCards,
        easeAvg: computed.avgEase,
        attempts: deckQuizAttempts.length,
        lastScore: lastQuiz ? Math.round((lastQuiz.correct / lastQuiz.total) * 100) : null,
        bestScore: bestQuiz ? Math.round((bestQuiz.correct / bestQuiz.total) * 100) : null,
      });
    })();
  }, [deck, deckId]);

  const learnedPct = useMemo(() => pct(stats.learned, stats.total), [stats.learned, stats.total]);

  // "À répéter" ≈ cartes dues maintenant mais déjà vues (donc dues - nouvelles)
  const toRepeat = useMemo(() => Math.max(0, stats.dueNow - stats.newCards), [stats.dueNow, stats.newCards]);

  // "Pas encore appris" (approximatif mais utile visuellement)
  const notLearned = useMemo(() => Math.max(0, stats.total - stats.learned), [stats.total, stats.learned]);

  const segLearned = stats.total ? clamp(stats.learned / stats.total) : 0;
  const segRepeat = stats.total ? clamp(toRepeat / stats.total) : 0;
  const segNotLearned = stats.total ? clamp(notLearned / stats.total) : 0;

  function goBackSmart() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  function goSettings() {
    router.push("/(tabs)/settings");
  }

  function startQuiz() {
    if (!deckId) return;
    router.push(`/deck/${encodeURIComponent(deckId)}/quiz`);
  }
  function openQuizHistory() {
    if (!deckId) return;
    router.push(`/deck/${encodeURIComponent(deckId)}/quiz-history`);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* TopBar */}
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

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header / Deck title */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <Text style={{ color: t.muted, fontFamily: t.font.medium, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
            Deck
          </Text>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 24, marginTop: 4 }} numberOfLines={1}>
            {deck?.title ?? "—"}
          </Text>
        </View>

        {/* Progress Hero (style “clair”) */}
        <LinearGradient
          colors={t.dark ? ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"] : ["#ffffff", "#f7f8fb"]}
          style={[styles.heroOuter, { marginTop: 12 }]}
        >
          <CardShell style={styles.heroInner}>
            <View style={{ flex: 1 }}>
              <View style={styles.heroTag}>
                <Ionicons name="stats-chart" size={16} color={t.primary} />
                <Text style={[styles.heroTagTxt, { color: t.primary, fontFamily: t.font.semibold }]}>
                  Aperçu
                </Text>
              </View>

              <Text style={[styles.heroBig, { color: t.text, fontFamily: t.font.display }]}>
                {learnedPct}%
              </Text>

              <Text style={[styles.heroSub, { color: t.muted, fontFamily: t.font.medium }]}>
                Appris sur {stats.total} cartes
              </Text>

              {/* Segmented bar */}
              <View style={[styles.segmentWrap, { backgroundColor: t.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
                <View style={[styles.segment, { flex: Math.max(0.001, segLearned), backgroundColor: "#7C3AED" }]} />
                <View style={[styles.segment, { flex: Math.max(0.001, segRepeat), backgroundColor: "#A78BFA" }]} />
                <View style={[styles.segment, { flex: Math.max(0.001, segNotLearned), backgroundColor: t.dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)" }]} />
              </View>

              <View style={{ marginTop: 10, gap: 6 }}>
                <LegendRow label="Appris" value={`${pct(stats.learned, stats.total)}%`} dot="#7C3AED" />
                <LegendRow label="À répéter" value={`${pct(toRepeat, stats.total)}%`} dot="#A78BFA" />
                <LegendRow label="Pas encore appris" value={`${pct(notLearned, stats.total)}%`} dot={t.dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.22)"} />
              </View>
            </View>

            <View style={[styles.heroIcon, { borderColor: t.border }]}>
              <Ionicons name="sparkles" size={24} color={t.primary} />
            </View>
          </CardShell>
        </LinearGradient>

        {/* Tiles grid */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
          <Text style={[styles.sectionTitle, { color: t.text, fontFamily: t.font.display }]}>Cartes</Text>

          <View style={styles.grid}>
            <StatTile label="Total" value={String(stats.total)} icon="albums-outline" accent={t.primary} />
            <StatTile
              label="À réviser"
              value={String(stats.dueNow)}
              icon="alert-circle-outline"
              accent="#EF4444"
              highlight
            />
          </View>

          <View style={styles.grid}>
            <StatTile label="Nouvelles" value={String(stats.newCards)} icon="sparkles-outline" accent="#3B82F6" />
            <StatTile label="Matures" value={String(stats.mature)} icon="time-outline" accent="#10B981" />
          </View>

          <View style={styles.grid}>
            <StatTile
              label="Apprises"
              value={String(stats.learned)}
              icon="checkmark-circle-outline"
              accent="#7C3AED"
            />
            <StatTile
              label="Ease moyen"
              value={stats.easeAvg === null ? "—" : String(stats.easeAvg)}
              icon="trending-up-outline"
              accent="#F59E0B"
            />
          </View>
        </View>

        {/* QCM */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: t.text, fontFamily: t.font.display }]}>QCM</Text>

          <CardShell>
            <View style={{ padding: 14, gap: 12 }}>
              <View style={styles.qcmRow}>
                <MiniStat label="Tentatives" value={String(stats.attempts)} />
                <MiniStat label="Dernier score" value={stats.lastScore === null ? "—" : `${stats.lastScore}%`} />
                <MiniStat label="Meilleur score" value={stats.bestScore === null ? "—" : `${stats.bestScore}%`} />
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <PrimaryButton title="Faire un QCM" onPress={startQuiz} />
                <SecondaryButton title="Historique" onPress={openQuizHistory} />
              </View>
            </View>
          </CardShell>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendRow({ label, value, dot }: { label: string; value: string; dot: string }) {
  const t = useStitchTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 22, height: 6, borderRadius: 99, backgroundColor: dot, marginRight: 10 }} />
      <Text style={{ flex: 1, color: t.muted, fontFamily: t.font.medium, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: t.muted, fontFamily: t.font.semibold, fontSize: 13 }}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.miniStat, { borderColor: t.border, backgroundColor: t.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
      <Text style={{ color: t.muted, fontFamily: t.font.semibold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }} numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1, flex: 1 },
      ]}
    >
      <Ionicons name="play-circle" size={20} color="#fff" />
      <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: t.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth,
          opacity: pressed ? 0.85 : 1,
          flex: 1,
        },
      ]}
    >
      <Ionicons name="time-outline" size={18} color={t.text} />
      <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 18 },

  sectionTitle: { fontSize: 18, marginBottom: 10 },

  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },

  heroOuter: { borderRadius: 20, padding: 2, marginHorizontal: 16 },
  heroInner: { borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },

  heroTag: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  heroTagTxt: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },

  heroBig: { fontSize: 40, lineHeight: 44 },
  heroSub: { fontSize: 14 },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
  },

  segmentWrap: {
    marginTop: 12,
    height: 10,
    borderRadius: 999,
    flexDirection: "row",
    overflow: "hidden",
  },
  segment: { height: "100%" },

  grid: { flexDirection: "row", gap: 12, marginBottom: 12 },

  tile: { flex: 1, borderRadius: 18, padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  tileTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  tileIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, flex: 1 },
  tileValue: { fontSize: 22 },

  qcmRow: { flexDirection: "row", gap: 10 },
  miniStat: { flex: 1, borderRadius: 14, padding: 10, borderWidth: StyleSheet.hairlineWidth, gap: 6 },

  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
});
