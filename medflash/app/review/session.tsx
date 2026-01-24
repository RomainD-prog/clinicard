import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoadingBlock } from "../../src/components/LoadingBlock";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { Deck } from "../../src/types/models";
import { defaultReviewRecord, updateSM2 } from "../../src/utils/spacedRepetition";

import { ReviewCardUI } from "../../src/uiStitch/ReviewCard";
import { useStitchTheme } from "../../src/uiStitch/theme";

export default function ReviewSession() {
  const router = useRouter();
  const t = useStitchTheme();

  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [dueIds, setDueIds] = useState<string[]>([]);
  const [deckMap, setDeckMap] = useState<Map<string, Deck>>(new Map()); // Pour session mixte
  const [pos, setPos] = useState(0);
  const [show, setShow] = useState(false);

  const { refreshReviewStats } = useAppStore();

  const [finished, setFinished] = useState(false);
  const [counts, setCounts] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    total: 0,
  });

  const isMixedSession = deckId === "all";

  useEffect(() => {
    (async () => {
      if (!deckId) return;

      if (isMixedSession) {
        // Session mixte : toutes les cartes de tous les decks
        const allDecks = await repo.listDecks();
        const allDueIds: string[] = [];
        const map = new Map<string, Deck>();

        for (const d of allDecks) {
          const dueForDeck = await repo.dueCardsForDeck(d);
          allDueIds.push(...dueForDeck);
          map.set(d.id, d);
        }

        // Mélange les cartes pour variété
        const shuffled = allDueIds.sort(() => Math.random() - 0.5);

        setDeckMap(map);
        setDueIds(shuffled);
        setDeck(null); // Pas de deck unique
      } else {
        // Session normale : un seul deck
      const d = await repo.getDeck(deckId);
      if (!d) return;

      const due = await repo.dueCardsForDeck(d);

      setDeck(d);
      setDueIds(due);
        setDeckMap(new Map([[d.id, d]]));
      }

      setPos(0);
      setShow(false);
      setFinished(false);
    })();
  }, [deckId, isMixedSession]);

  const card = useMemo(() => {
    const cardId = dueIds[pos];
    if (!cardId) return null;

    if (isMixedSession) {
      // Cherche la carte dans tous les decks
      for (const d of deckMap.values()) {
        const c = d.cards.find((card) => card.id === cardId);
        if (c) return c;
      }
      return null;
    } else {
      // Session normale : un seul deck
    if (!deck) return null;
      return deck.cards.find((c) => c.id === cardId) ?? null;
    }
  }, [deck, deckMap, dueIds, pos, isMixedSession]);

  // Helper : trouve le deckId d'une carte
  const findDeckIdForCard = (cardId: string): string | null => {
    if (!isMixedSession && deck) return deck.id;
    
    for (const d of deckMap.values()) {
      if (d.cards.some((c) => c.id === cardId)) {
        return d.id;
      }
    }
    return null;
  };

  async function grade(quality: 2 | 3 | 4 | 5) {
    if (!card) return;

    const cardDeckId = findDeckIdForCard(card.id);
    if (!cardDeckId) return;

    const existing = await repo.getReview(cardDeckId, card.id);
    const rec = existing ?? defaultReviewRecord(cardDeckId, card.id);
    const updated = updateSM2(rec, quality);

    await repo.upsertReview(updated);
    await repo.recordReviewDone();
    await refreshReviewStats();

    setCounts((c) => ({
      ...c,
      total: c.total + 1,
      again: c.again + (quality === 2 ? 1 : 0),
      hard: c.hard + (quality === 3 ? 1 : 0),
      good: c.good + (quality === 4 ? 1 : 0),
      easy: c.easy + (quality === 5 ? 1 : 0),
    }));

    const nextPos = pos + 1;
    if (nextPos >= dueIds.length) {
      setFinished(true);
      setShow(false);
      return;
    }

    setPos(nextPos);
    setShow(false);
  }

  // states
  if (!isMixedSession && !deck) {
    return (
      <View style={{ padding: 16 }}>
        <LoadingBlock label="Chargement…" />
      </View>
    );
  }

  if (isMixedSession && deckMap.size === 0) {
    return (
      <View style={{ padding: 16 }}>
        <LoadingBlock label="Chargement…" />
      </View>
    );
  }

  if (dueIds.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ fontSize: 22, fontFamily: t.font.display, color: t.text }}>✅ Rien à revoir</Text>
        <Text style={{ marginTop: 6, fontFamily: t.font.body, color: t.muted }}>
          Reviens plus tard, ou fais un quiz.
        </Text>

        <View style={{ height: 14 }} />
        <Text
          onPress={() => router.push("/import")}
          style={{ color: t.primary, fontFamily: t.font.semibold }}
        >
          Importer un cours
        </Text>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ fontSize: 22, fontFamily: t.font.display, color: t.text }}>✅ Session terminée</Text>

        <Text style={{ marginTop: 8, fontFamily: t.font.body, color: t.muted }}>
          Cartes revues : <Text style={{ fontFamily: t.font.display, color: t.text }}>{counts.total}</Text>
        </Text>

        <Text style={{ marginTop: 6, fontFamily: t.font.body, color: t.muted }}>
          Again: {counts.again} • Hard: {counts.hard} • Good: {counts.good} • Easy: {counts.easy}
        </Text>

        <View style={{ height: 16 }} />
        <Text
          onPress={() => router.back()}
          style={{ color: t.primary, fontFamily: t.font.display }}
        >
          Revenir
        </Text>

        <View style={{ height: 10 }} />
        <Text
          onPress={() => {
            setFinished(false);
            setCounts({ again: 0, hard: 0, good: 0, easy: 0, total: 0 });
            setPos(0);
            setShow(false);
          }}
          style={{ color: t.muted, fontFamily: t.font.semibold }}
        >
          Recommencer cette session
        </Text>
      </View>
    );
  }

  if (!card) {
    return (
      <View style={{ padding: 16 }}>
        <LoadingBlock label="Préparation…" />
      </View>
    );
  }

  const progress = (pos + 1) / dueIds.length;

  const sourceText =
    typeof card.sourcePage === "number"
      ? `Source p.${card.sourcePage}${card.sourceSnippet ? ` — ${card.sourceSnippet}` : ""}`
      : undefined;

  // Trouve le deck de la carte actuelle pour le tag
  const currentDeckId = findDeckIdForCard(card.id);
  const currentDeck = currentDeckId ? deckMap.get(currentDeckId) : deck;
  const sessionTitle = isMixedSession ? "Session Mixte" : "Revision";
  const tagLabel = currentDeck?.level ?? "—";

  return (
    <ReviewCardUI
      title={sessionTitle}
      index={pos + 1}
      total={dueIds.length}
      progress={progress}
      tag={tagLabel}
      deckTitle={isMixedSession ? currentDeck?.title : undefined}
      question={card.question}
      answer={card.answer}
      sourceText={sourceText}
      revealed={show}
      onReveal={() => setShow(true)}
      onClose={() => router.back()}
      onAgain={() => grade(2)}
      onHard={() => grade(3)}
      onGood={() => grade(4)}
      onEasy={() => grade(5)}
      onEdit={() =>
        router.push({
          pathname: "/deck/[deckId]/card-editor",
          params: { deckId: currentDeckId ?? "", cardId: card.id },
        })
      }
      
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
});
