import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { Deck } from "../../src/types/models";
import { computeDeckStats, DeckReviewStats, pct } from "../../src/utils/stats";

import { StatTile } from "../../src/uiStitch/Cards";
import { useStitchTheme } from "../../src/uiStitch/theme";
import { TopBar } from "../../src/uiStitch/TopBar";

type DeckRow = {
  deck: Deck;
  stats: DeckReviewStats;
};

function fmtAttempt(stats: DeckReviewStats) {
  if (!stats.lastQuiz) return "—";
  const p = Math.round((stats.lastQuiz.correct / stats.lastQuiz.total) * 100);
  return `${stats.lastQuiz.correct}/${stats.lastQuiz.total} (${p}%)`;
}

function StitchButton({
  title,
  onPress,
  variant = "primary",
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const t = useStitchTheme();
  const bg = variant === "primary" ? t.primary : t.card;
  const txt = variant === "primary" ? "#fff" : t.text;
  const border = variant === "primary" ? "transparent" : t.border;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={{ color: txt, fontFamily: t.font.display, fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

export default function ReviewTab() {
  const router = useRouter();
  const t = useStitchTheme();

  const { decks, reviewStats, refreshReviewStats } = useAppStore();

  const [rows, setRows] = useState<DeckRow[] | null>(null);
  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    (async () => {
      await refreshReviewStats();

      if (decks.length === 0) {
        setRows([]);
        setTotalDue(0);
        return;
      }

      const reviews = await repo.listReviews();
      const allAttempts = await repo.listAllQuizAttempts();

      const nextRows: DeckRow[] = decks.map((d) => {
        const attempts = allAttempts.filter((a) => a.deckId === d.id);
        const stats = computeDeckStats({ deck: d, reviews, quizAttempts: attempts });
        return { deck: d, stats };
      });

      nextRows.sort((a, b) => b.stats.dueCards - a.stats.dueCards);

      setRows(nextRows);
      setTotalDue(nextRows.reduce((acc, r) => acc + r.stats.dueCards, 0));
    })();
  }, [decks, refreshReviewStats]);

  if (!rows) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 16 }}>
        <Text style={{ color: t.muted, fontFamily: t.font.medium }}>Préparation du dashboard…</Text>
      </View>
    );
  }

  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <StatTile label="À faire" value={`${totalDue}`} icon="albums-outline" accent={t.primary} />
        <StatTile label="Cours" value={`${decks.length}`} icon="library-outline" accent="#10b981" />
        <StatTile label="Faites" value={`${reviewStats.doneToday}`} icon="checkmark-circle-outline" accent="#f59e0b" />
      </View>

      <View style={[styles.sectionRow, { marginTop: 16 }]}>
        <Text style={{ color: t.text, fontSize: 18, fontFamily: t.font.display }}>Par deck</Text>
      </View>

      {rows.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={{ color: t.muted, fontFamily: t.font.body }}>
            Aucun deck. Va sur Accueil → Importer.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar   title="Réviser"
  showBack={false} // ✅
  rightIcon="settings-outline"
  onPressRight={() => router.push("/(tabs)/settings")}
  variant="large"/>

      <FlatList
        data={rows}
        keyExtractor={(x) => x.deck.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 30 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const d = item.deck;
          const s = item.stats;

          return (
            <View style={[styles.deckCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <Text style={{ color: t.text, fontFamily: t.font.display }} numberOfLines={1}>
                {d.title}
              </Text>

              <Text style={{ color: t.muted, marginTop: 6, fontFamily: t.font.body }}>
                À réviser: <Text style={{ fontFamily: t.font.display, color: t.text }}>{s.dueCards}</Text> •
                Apprises:{" "}
                <Text style={{ fontFamily: t.font.display, color: t.text }}>
                  {pct(s.learnedCards, s.totalCards)}%
                </Text>{" "}
                • QCM:{" "}
                <Text style={{ fontFamily: t.font.display, color: t.text }}>{fmtAttempt(s)}</Text>
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <StitchButton
                    title="Réviser"
                    onPress={() => router.push(`/review/session?deckId=${d.id}`)}
                    disabled={s.dueCards === 0}
                    variant="primary"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StitchButton
                    title="Stats"
                    onPress={() => router.push(`/deck/${d.id}/stats`)}
                    variant="secondary"
                  />
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  deckCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  emptyCard: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
