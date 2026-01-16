import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { Deck } from "../../src/types/models";
import { computeDeckStats } from "../../src/utils/stats";

import { HeroStreakCard, StatTile } from "../../src/uiStitch/Cards";
import { useStitchTheme } from "../../src/uiStitch/theme";
import { TopBar } from "../../src/uiStitch/TopBar";

function DeckRow({ deck, onOpen }: { deck: Deck; onOpen: () => void }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.deckRow, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: t.text, fontFamily: t.font.display }}>
          {deck.title}
        </Text>
        <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
          {deck.cards.length} cartes • {deck.mcqs.length} QCM
        </Text>
      </View>

      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.openBtn,
          { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={{ color: "#fff", fontFamily: t.font.display }}>Ouvrir</Text>
      </Pressable>
    </View>
  );
}

export default function HomeTab() {
  const router = useRouter();
  const t = useStitchTheme();

  const { decks, reviewStats, refreshReviewStats } = useAppStore();

  const [totalDue, setTotalDue] = useState(0);

  useEffect(() => {
    (async () => {
      await refreshReviewStats();

      if (decks.length === 0) {
        setTotalDue(0);
        return;
      }

      const reviews = await repo.listReviews();
      // calc “due” global simple via computeDeckStats (déjà chez toi)
      const sum = decks.reduce((acc, d) => {
        const s = computeDeckStats({ deck: d, reviews, quizAttempts: [] });
        return acc + s.dueCards;
      }, 0);

      setTotalDue(sum);
    })();
  }, [decks, refreshReviewStats]);

  const recent = useMemo(() => decks.slice(0, 3), [decks]);

  const header = (
    <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
      <View style={{ marginTop: 10 }}>
        <HeroStreakCard
          streak={reviewStats.streak}
          subtitle={`${totalDue} ${totalDue > 1 ? 'cartes à réviser' : 'carte à réviser'}`}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <StatTile label="À réviser" value={`${totalDue}`} icon="school-outline" accent={t.primary} />
        <StatTile label="Cours" value={`${decks.length}`} icon="library-outline" accent="#10b981" />
      </View>

      <View style={{ marginTop: 16 }}>
        <Pressable
          onPress={() => router.push("/import")}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 16 }}>📥 Importer un cours</Text>
        </Pressable>
      </View>

      <Text style={{ marginTop: 18, color: t.text, fontFamily: t.font.display, fontSize: 18 }}>
        Derniers decks
      </Text>

      {decks.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={{ color: t.muted, fontFamily: t.font.body }}>
            Aucun deck pour l'instant. Importe un PDF et on s'occupe du reste.
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Accueil"
        showBack={false}          // ✅ pas de retour sur un onglet
        variant="large" />

      <FlatList
        data={recent}
        keyExtractor={(d) => d.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 30 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <DeckRow deck={item} onOpen={() => router.push(`/deck/${item.id}`)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cta: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  deckRow: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  openBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
