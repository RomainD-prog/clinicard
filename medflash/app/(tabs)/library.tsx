import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { Deck } from "../../src/types/models";
import { useStitchTheme } from "../../src/uiStitch/theme";
import { computeDeckStats, pct } from "../../src/utils/stats";
import { userInitials } from "../../src/utils/user";

const { decks, authUser } = useAppStore();
const initials = userInitials(authUser);

type DeckRow = {
  deck: Deck;
  learnedPct: number; // 0..100
  dueCards: number;
  isNew: boolean;
};

/** -------------------------------
 *  Subject → Icon + Color (stable)
 *  ------------------------------- */
type IoniconName = keyof typeof Ionicons.glyphMap;

function normSubject(s?: string) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function alphaColor(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const SUBJECT_RULES: Array<{ match: RegExp; icon: IoniconName; color: string }> = [
  { match: /(cardio|cardiologie)/, icon: "heart-outline", color: "#ef4444" },
  { match: /(anat|anatomie)/, icon: "body-outline", color: "#8b5cf6" },
  { match: /(neuro|neurologie)/, icon: "sparkles-outline", color: "#a855f7" },
  { match: /(pharma|pharmacologie)/, icon: "medkit-outline", color: "#06b6d4" },
  { match: /(infect|microbio)/, icon: "bug-outline", color: "#22c55e" },
  { match: /(immuno)/, icon: "shield-checkmark-outline", color: "#22c55e" },
  { match: /(radio|imagerie)/, icon: "scan-outline", color: "#0ea5e9" },
  { match: /(chir|chirurgie)/, icon: "cut-outline", color: "#f97316" },
  { match: /(gyne|obst|grossesse)/, icon: "female-outline", color: "#ec4899" },
  { match: /(pedi|pediatrie)/, icon: "happy-outline", color: "#f59e0b" },
  { match: /(psy|psychiatrie)/, icon: "chatbubble-ellipses-outline", color: "#6366f1" },
  { match: /(derm|dermatologie)/, icon: "leaf-outline", color: "#22c55e" },
  { match: /(orl)/, icon: "ear-outline", color: "#0ea5e9" },
  { match: /(ophta|ophtalmo)/, icon: "eye-outline", color: "#0ea5e9" },
  { match: /(kine|physio|rehab|reeducation)/, icon: "walk-outline", color: "#3b82f6" },
];

const FALLBACK_ICONS: IoniconName[] = [
  "book-outline",
  "school-outline",
  "bandage-outline",
  "flask-outline",
  "pulse-outline",
  "fitness-outline",
  "leaf-outline",
  "planet-outline",
];

const FALLBACK_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ef4444",
  "#f97316",
  "#64748b",
];

function subjectMeta(subject?: string) {
  const key = normSubject(subject);
  if (!key) {
    return { label: "Sans matière", icon: "book-outline" as IoniconName, color: "#64748b" };
  }

  for (const r of SUBJECT_RULES) {
    if (r.match.test(key)) return { label: subject!, icon: r.icon, color: r.color };
  }

  const h = hashStr(key);
  return {
    label: subject!,
    icon: FALLBACK_ICONS[h % FALLBACK_ICONS.length],
    color: FALLBACK_COLORS[h % FALLBACK_COLORS.length],
  };
}

function Cover({ subject }: { subject?: string }) {
  const t = useStitchTheme();
  const meta = subjectMeta(subject);

  const bg = alphaColor(meta.color, t.dark ? 0.18 : 0.12);
  const fg = meta.color;

  return (
    <View style={[styles.cover, { backgroundColor: bg }]}>
      <Ionicons name={meta.icon} size={26} color={fg} />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? t.primary : (t.dark ? "#1c2127" : "#fff"),
          borderColor: active ? t.primary : (t.dark ? "#2a3440" : "#E5E7EB"),
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : (t.dark ? "#CBD5E1" : "#475569"),
          fontFamily: t.font.medium,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProgressBar({ value01 }: { value01: number }) {
  const t = useStitchTheme();
  const v = Math.max(0, Math.min(1, value01));
  return (
    <View style={[styles.progressTrack, { backgroundColor: t.dark ? "#2a3440" : "#EEF2F7" }]}>
      <View style={[styles.progressFill, { width: `${v * 100}%`, backgroundColor: t.primary }]} />
    </View>
  );
}

export default function LibraryTab() {
  const router = useRouter();
  const t = useStitchTheme();

  const { decks } = useAppStore();

  const [query, setQuery] = useState("");
  const [activeChip, setActiveChip] = useState<string>("All");
  const [rows, setRows] = useState<DeckRow[] | null>(null);

  const chips = useMemo(() => {
    const subjects = Array.from(
      new Set(decks.map((d) => (d.subject?.trim() ? d.subject.trim() : "Sans matière")))
    );
    subjects.sort((a, b) => a.localeCompare(b));
    return ["All", ...subjects];
  }, [decks]);

  useEffect(() => {
    (async () => {
      const reviews = await repo.listReviews();
      const allAttempts = await repo.listAllQuizAttempts();

      const next: DeckRow[] = decks.map((d) => {
        const attempts = allAttempts.filter((a) => a.deckId === d.id);
        const s = computeDeckStats({ deck: d, reviews, quizAttempts: attempts });

        const learnedPct = pct(s.learnedCards, s.totalCards);
        const isNew = s.learnedCards === 0 && s.totalCards > 0;

        return { deck: d, learnedPct, dueCards: s.dueCards, isNew };
      });

      next.sort((a, b) => b.dueCards - a.dueCards);
      setRows(next);
    })();
  }, [decks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (rows ?? []).filter((r) => {
      const subjectLabel = r.deck.subject?.trim() ? r.deck.subject.trim() : "Sans matière";
      const okChip = activeChip === "All" ? true : subjectLabel === activeChip;
      const okQuery = q.length === 0 ? true : r.deck.title.toLowerCase().includes(q);
      return okChip && okQuery;
    });
  }, [rows, query, activeChip]);

  const surface = t.dark ? "#1c2127" : "#ffffff";
  const bg = t.bg;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bg }}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: "transparent" }]}>
        <Text style={[styles.h1, { color: t.text, fontFamily: t.font.display }]}>Cours</Text>

        <Pressable
          onPress={() => router.push("/(tabs)/settings")}
          style={({ pressed }) => [
            styles.avatarBtn,
            { borderColor: t.dark ? "#334155" : "#E5E7EB", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={[styles.avatarFill, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]} />
          <Text style={{ position: "absolute", color: t.text, fontFamily: t.font.display, fontSize: 12 }}>
            {initials}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <View
            style={[
              styles.searchWrap,
              {
                backgroundColor: surface,
                borderColor: t.dark ? "#2a3440" : "#E5E7EB",
              },
            ]}
          >
            <Ionicons name="search" size={18} color={t.muted} style={{ marginLeft: 12 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search topics or decks..."
              placeholderTextColor={t.muted}
              style={[
                styles.searchInput,
                { color: t.text, fontFamily: t.font.body },
              ]}
            />
          </View>
        </View>

        {/* Hero Import */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
          <View
            style={[
              styles.hero,
              { backgroundColor: surface, borderColor: t.dark ? "#2a3440" : "#E5E7EB" },
            ]}
          >
            <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="sparkles-outline" size={18} color={t.primary} />
                  <Text style={{ color: t.primary, fontFamily: t.font.semibold, fontSize: 12, letterSpacing: 1 }}>
                    AI GENERATOR
                  </Text>
                </View>

                <Text style={{ marginTop: 6, color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
                  Transforme ton cours en flashcards
                </Text>
                <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
                  Upload un PDF et laisse le LLM construire ton deck instantanément.
                </Text>
              </View>

              <View style={[styles.heroIconBox, { backgroundColor: "rgba(19,127,236,0.12)" }]}>
                <Ionicons name="cloud-upload-outline" size={26} color={t.primary} />
              </View>
            </View>

            <Pressable
              onPress={() => router.push("/import")}
              style={({ pressed }) => [
                styles.heroBtn,
                { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 14 }}>
                Importer un cours
              </Text>
            </Pressable>

            <View
              pointerEvents="none"
              style={[styles.blob, { right: -30, top: -30, backgroundColor: "rgba(19,127,236,0.10)" }]}
            />
            <View
              pointerEvents="none"
              style={[styles.blob, { left: -30, bottom: -30, backgroundColor: "rgba(19,127,236,0.10)" }]}
            />
          </View>
        </View>

        {/* Chips */}
        <View style={{ paddingBottom: 14 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {chips.map((c) => (
              <Chip key={c} label={c} active={c === activeChip} onPress={() => setActiveChip(c)} />
            ))}
          </ScrollView>
        </View>

        {/* List title */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>
            Tes cours
          </Text>
        </View>

        {/* List */}
        {rows === null ? (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{ color: t.muted, fontFamily: t.font.body }}>Chargement…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: t.dark ? "#2a3440" : "#E5E7EB" }]}>
              <Text style={{ color: t.text, fontFamily: t.font.display }}>Aucun résultat</Text>
              <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
                Essaie un autre mot-clé ou importe un PDF.
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(x) => x.deck.id}
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item }) => {
              const d = item.deck;
              const badge =
                item.isNew ? { label: "New", colorBg: "rgba(100,116,139,0.10)", colorText: t.dark ? "#94A3B8" : "#64748B" }
                : item.dueCards > 0 ? { label: "Active", colorBg: "rgba(34,197,94,0.10)", colorText: "#22c55e" }
                : null;

              return (
                <Pressable
                  onPress={() => router.push(`/deck/${d.id}`)}
                  style={({ pressed }) => [
                    styles.courseCard,
                    {
                      backgroundColor: surface,
                      borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  {/* ✅ badge “pinned” toujours au même endroit */}
                  {badge ? (
                    <View
                      style={[
                        styles.badgePinned,
                        { backgroundColor: badge.colorBg, borderColor: t.dark ? "#2a3440" : "#E5E7EB" },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          letterSpacing: 1,
                          fontFamily: t.font.semibold,
                          color: badge.colorText,
                        }}
                      >
                        {badge.label.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <Cover subject={d.subject} />

                    <View style={{ flex: 1 }}>
                      {/* ✅ ligne titre sans badge */}
                      <Text numberOfLines={1} style={{ color: t.text, fontFamily: t.font.display, fontSize: 15, paddingRight: 72 }}>
                        {d.title}
                      </Text>

                      <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
                        {d.cards.length} Cards • {item.dueCards} à réviser
                      </Text>

                      <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <ProgressBar value01={item.learnedPct / 100} />
                        <Text
                          style={{
                            width: 40,
                            textAlign: "right",
                            color: t.dark ? "#CBD5E1" : "#475569",
                            fontFamily: t.font.medium,
                            fontSize: 12,
                          }}
                        >
                          {item.learnedPct}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>

              );
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontSize: 22 },

  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFill: { width: "100%", height: "100%" },
  badgePinned: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  
  searchWrap: {
    height: 52,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 10,
    fontSize: 15,
  },

  hero: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: "hidden",
    gap: 14,
  },
  heroIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBtn: {
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  blob: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 999,
  },

  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  courseCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },

  cover: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  progressTrack: {
    height: 8,
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  emptyCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
});
