import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View, ScrollView } from "react-native";

import { LoadingBlock } from "../../../src/components/LoadingBlock";
import * as repo from "../../../src/storage/repo";
import { QuizAttempt } from "../../../src/types/models";
import { TopBar } from "../../../src/uiStitch/TopBar";
import { useStitchTheme } from "../../../src/uiStitch/theme";

function fmt(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Hier à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function QuizHistoryScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const router = useRouter();
  const t = useStitchTheme();
  const [items, setItems] = useState<QuizAttempt[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!deckId) return;
      const list = await repo.listQuizAttempts(deckId);
      // Trier du plus récent au plus ancien
      const sorted = list.sort((a, b) => b.createdAt - a.createdAt);
      setItems(sorted);
    })();
  }, [deckId]);

  if (!items) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <TopBar title="Historique QCM" variant="small" />
      <View style={{ padding: 16 }}>
        <LoadingBlock label="Chargement historique…" />
        </View>
      </View>
    );
  }

  // Calculer les statistiques globales
  const totalAttempts = items.length;
  const avgScore = totalAttempts > 0
    ? Math.round(items.reduce((sum, item) => sum + (item.correct / item.total) * 100, 0) / totalAttempts)
    : 0;
  const bestScore = totalAttempts > 0
    ? Math.max(...items.map(item => Math.round((item.correct / item.total) * 100)))
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar title="Historique QCM" variant="small" />
      
      <ScrollView style={{ flex: 1 }}>
        {/* Stats globales */}
        {totalAttempts > 0 && (
          <View style={{ padding: 16, paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={[styles.statIcon, { backgroundColor: t.dark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                  <Ionicons name="stats-chart" size={20} color="#6366f1" />
                </View>
                <Text style={[styles.statValue, { color: t.text, fontFamily: t.font.display }]}>
                  {avgScore}%
                </Text>
                <Text style={[styles.statLabel, { color: t.muted, fontFamily: t.font.medium }]}>
                  Moyenne
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={[styles.statIcon, { backgroundColor: t.dark ? "rgba(34,197,94,0.15)" : "#F0FDF4" }]}>
                  <Ionicons name="trophy" size={20} color="#22c55e" />
                </View>
                <Text style={[styles.statValue, { color: t.text, fontFamily: t.font.display }]}>
                  {bestScore}%
                </Text>
                <Text style={[styles.statLabel, { color: t.muted, fontFamily: t.font.medium }]}>
                  Meilleur
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: t.card, borderColor: t.border }]}>
                <View style={[styles.statIcon, { backgroundColor: t.dark ? "rgba(168,85,247,0.15)" : "#FAF5FF" }]}>
                  <Ionicons name="documents" size={20} color="#a855f7" />
                </View>
                <Text style={[styles.statValue, { color: t.text, fontFamily: t.font.display }]}>
                  {totalAttempts}
                </Text>
                <Text style={[styles.statLabel, { color: t.muted, fontFamily: t.font.medium }]}>
                  Tentatives
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Liste des tentatives */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <Text style={[styles.sectionTitle, { color: t.text, fontFamily: t.font.display }]}>
            Historique
          </Text>

          {items.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: t.dark ? "rgba(148,163,184,0.1)" : "#F1F5F9" }]}>
                <Ionicons name="document-text-outline" size={32} color={t.muted} />
              </View>
              <Text style={[styles.emptyTitle, { color: t.text, fontFamily: t.font.display }]}>
                Aucune tentative
              </Text>
              <Text style={[styles.emptyDesc, { color: t.muted, fontFamily: t.font.body }]}>
                Tes résultats de QCM apparaîtront ici
              </Text>
            </View>
          ) : (
            items.map((item, idx) => {
              const pct = Math.round((item.correct / item.total) * 100);
              let scoreColor = "#ef4444"; // rouge
              let scoreBg = t.dark ? "rgba(239,68,68,0.15)" : "#FEF2F2";
              
              if (pct >= 80) {
                scoreColor = "#22c55e"; // vert
                scoreBg = t.dark ? "rgba(34,197,94,0.15)" : "#F0FDF4";
              } else if (pct >= 50) {
                scoreColor = "#f59e0b"; // orange
                scoreBg = t.dark ? "rgba(245,158,11,0.15)" : "#FFFBEB";
              }

              return (
                <View
                  key={item.id}
                  style={[
                    styles.historyCard,
                    { backgroundColor: t.card, borderColor: t.border },
                    idx < items.length - 1 && { marginBottom: 10 }
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <View style={[styles.badge, { backgroundColor: scoreBg }]}>
                          <Text style={[styles.badgeText, { color: scoreColor, fontFamily: t.font.display }]}>
                            {pct}%
                          </Text>
                        </View>
                        <Text style={[styles.scoreDetail, { color: t.muted, fontFamily: t.font.medium }]}>
                          {item.correct}/{item.total} bonnes réponses
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="time-outline" size={14} color={t.muted} />
                        <Text style={[styles.timestamp, { color: t.muted, fontFamily: t.font.body }]}>
                          {fmt(item.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.scoreCircle, { backgroundColor: scoreBg, borderColor: scoreColor }]}>
                      <Ionicons 
                        name={pct >= 80 ? "checkmark" : pct >= 50 ? "remove" : "close"} 
                        size={24} 
                        color={scoreColor} 
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
    marginTop: 8,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 16,
  },
  scoreDetail: {
    fontSize: 14,
  },
  timestamp: {
    fontSize: 13,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: "center",
  },
});
