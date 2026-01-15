// app/deck/[deckId]/quiz.tsx
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import * as repo from "../../../src/storage/repo";
import { useStitchTheme } from "../../../src/uiStitch/theme";

type Choice = { label: string; text: string };
type NormalizedMCQ = {
  id?: string;
  stem: string;
  choices: Choice[];
  correctLabel?: string;
  explanation?: string;
};

function clampLabel(i: number) {
  return ["A", "B", "C", "D", "E"][i] ?? String.fromCharCode(65 + i);
}

function normalizeMcq(raw: any): NormalizedMCQ {
  const stem = String(raw?.stem ?? raw?.question ?? raw?.prompt ?? "").trim();

  // formats possibles: choices[{label,text}], options[], answers[]
  const rawChoices = raw?.choices ?? raw?.options ?? raw?.answers ?? raw?.propositions ?? [];
  let choices: Choice[] = [];

  if (Array.isArray(rawChoices)) {
    if (rawChoices.length > 0 && typeof rawChoices[0] === "string") {
      choices = rawChoices.map((txt: string, i: number) => ({
        label: clampLabel(i),
        text: String(txt).trim(),
      }));
    } else {
      choices = rawChoices.map((c: any, i: number) => ({
        label: String(c?.label ?? clampLabel(i)).trim(),
        text: String(c?.text ?? c?.value ?? c?.title ?? "").trim(),
      }));
    }
  }

  // correct label peut être correctLabel (nouveau) ou correctIndex (ancien)
  let correctLabel = raw?.correctLabel ?? raw?.correct ?? raw?.answerLabel;
  if (!correctLabel && typeof raw?.correctIndex === "number") {
    correctLabel = clampLabel(raw.correctIndex);
  }

  const explanation = String(raw?.explanation ?? raw?.rationale ?? raw?.justification ?? "").trim();

  return {
    id: raw?.id,
    stem,
    choices: choices.filter((c) => c.text.length > 0),
    correctLabel: correctLabel ? String(correctLabel).trim() : undefined,
    explanation: explanation || undefined,
  };
}

function Card({ children }: { children: React.ReactNode }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {children}
    </View>
  );
}

export default function QuizScreen() {
  const router = useRouter();
  const t = useStitchTheme();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<any>(null);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!deckId) return;
        const d = await repo.getDeck(String(deckId));
        if (alive) setDeck(d);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [deckId]);

  const mcqs = useMemo(() => {
    const raw = deck?.mcqs ?? deck?.qcm ?? deck?.questions ?? [];
    return Array.isArray(raw) ? raw.map(normalizeMcq) : [];
  }, [deck]);

  const q = mcqs[idx];

  const canRenderQuestion = !!q && q.stem && Array.isArray(q.choices) && q.choices.length > 0;

  function pick(label: string) {
    if (revealed) return;
    setSelected(label);
    setRevealed(true);

    // scoring si on a une bonne réponse
    if (q?.correctLabel && label === q.correctLabel) {
      setScore((s) => s + 1);
    }
  }

  function next() {
    setSelected(null);
    setRevealed(false);
    setIdx((i) => Math.min(i + 1, mcqs.length - 1));
  }

  function restart() {
    setIdx(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>

        <Text style={{ flex: 1, textAlign: "center", color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
          QCM
        </Text>

        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {loading ? (
          <Card>
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Chargement…</Text>
            <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
              Récupération du deck.
            </Text>
          </Card>
        ) : mcqs.length === 0 ? (
          <Card>
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
              Aucun QCM dans ce deck
            </Text>
            <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
              Regénère le deck avec “Nombre de QCM” &gt; 0 (ou vérifie tes anciens decks).
            </Text>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: t.font.display }}>Retour</Text>
            </Pressable>
          </Card>
        ) : !canRenderQuestion ? (
          <Card>
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
              QCM mal formé
            </Text>
            <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
              Ce deck contient des QCM au format ancien (ex: pas de “choices”). Le code évite le crash,
              mais il faut regénérer le deck pour un QCM complet.
            </Text>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: t.font.display }}>Retour</Text>
            </Pressable>
          </Card>
        ) : idx >= mcqs.length ? (
          <Card>
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>Terminé 🎉</Text>
            <Text style={{ marginTop: 8, color: t.muted, fontFamily: t.font.body }}>
              Score : {score} / {mcqs.length}
            </Text>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={restart}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: t.font.display }}>Recommencer</Text>
            </Pressable>
          </Card>
        ) : (
          <>
            {/* Header QCM */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ color: t.muted, fontFamily: t.font.body }}>
                Question {idx + 1} / {mcqs.length}
              </Text>
              <Text style={{ color: t.muted, fontFamily: t.font.body }}>
                Score {score}
              </Text>
            </View>

            <Card>
              <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
                {q.stem}
              </Text>

              <View style={{ height: 12 }} />

              {q.choices.map((c) => {
                const isSelected = selected === c.label;
                const isCorrect = revealed && q.correctLabel === c.label;
                const isWrongSelected = revealed && isSelected && q.correctLabel && c.label !== q.correctLabel;

                const bg = isCorrect
                  ? "rgba(34,197,94,0.12)"
                  : isWrongSelected
                    ? "rgba(239,68,68,0.10)"
                    : t.card;

                const border = isCorrect
                  ? "rgba(34,197,94,0.35)"
                  : isWrongSelected
                    ? "rgba(239,68,68,0.30)"
                    : t.border;

                return (
                  <Pressable
                    key={c.label}
                    onPress={() => pick(c.label)}
                    style={({ pressed }) => [
                      styles.choice,
                      { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <View style={[styles.choiceTag, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]}>
                      <Text style={{ color: t.text, fontFamily: t.font.display }}>{c.label}</Text>
                    </View>
                    <Text style={{ flex: 1, color: t.text, fontFamily: t.font.body }}>
                      {c.text}
                    </Text>

                    {revealed && q.correctLabel ? (
                      isCorrect ? (
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                      ) : isWrongSelected ? (
                        <Ionicons name="close-circle" size={18} color="#ef4444" />
                      ) : null
                    ) : null}
                  </Pressable>
                );
              })}

              {revealed && (q.explanation || q.correctLabel) ? (
                <View style={{ marginTop: 12 }}>
                  {q.correctLabel ? (
                    <Text style={{ color: t.muted, fontFamily: t.font.body }}>
                      Bonne réponse : <Text style={{ fontFamily: t.font.display, color: t.text }}>{q.correctLabel}</Text>
                    </Text>
                  ) : null}

                  {q.explanation ? (
                    <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
                      {q.explanation}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Card>

            <View style={{ height: 14 }} />

            <Pressable
              onPress={idx === mcqs.length - 1 ? restart : next}
              disabled={!revealed}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: t.primary,
                  opacity: !revealed ? 0.45 : pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: t.font.display }}>
                {idx === mcqs.length - 1 ? "Terminer" : "Question suivante"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </>
        )}
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

  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  choice: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  choiceTag: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});
