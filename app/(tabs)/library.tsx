import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Modal,
  Platform,
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
import { Category, Deck } from "../../src/types/models";
import { useStitchTheme } from "../../src/uiStitch/theme";
import { computeDeckStats, pct } from "../../src/utils/stats";
import { userInitials } from "../../src/utils/user";

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

const FALLBACK_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#f97316", "#64748b"];

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

function ProgressBar({ value01 }: { value01: number }) {
  const t = useStitchTheme();
  const v = Math.max(0, Math.min(1, value01));
  return (
    <View style={[styles.progressTrack, { backgroundColor: t.dark ? "#2a3440" : "#EEF2F7" }]}>
      <View style={[styles.progressFill, { width: `${v * 100}%`, backgroundColor: t.primary }]} />
    </View>
  );
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: t.dark ? "#1c2127" : "#fff",
          borderColor: t.dark ? "#2a3440" : "#E5E7EB",
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: t.dark ? "#CBD5E1" : "#475569",
          fontFamily: t.font.medium,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
      <Ionicons name="chevron-down" size={16} color={t.muted} />
    </Pressable>
  );
}

export default function LibraryTab() {
  const { decks, categories, authUser, moveDeckToCategory, createCategory, refreshCategories } = useAppStore();
  const initials = userInitials(authUser);

  const router = useRouter();
  const t = useStitchTheme();

  const [query, setQuery] = useState("");

  // Filters
  const [activeSubject, setActiveSubject] = useState<string>("All"); // "All" | "Sans matière" | subject
  const [activeFolder, setActiveFolder] = useState<string>("all"); // "all" | "none" | categoryId

  // Rows (computed stats)
  const [rows, setRows] = useState<DeckRow[] | null>(null);

  // Create folder modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Move-to modal (triggered via long-press menu)
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveDeck, setMoveDeck] = useState<Deck | null>(null);
  const [moveSearch, setMoveSearch] = useState("");

  // Dropdown filter modals (scalable with 100+ categories/subjects)
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [folderSearch, setFolderSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");

  // Prevent accidental navigation right after a long press
  const suppressNextPressForDeckId = useRef<string | null>(null);

  const subjects = useMemo(() => {
    const out = Array.from(new Set(decks.map((d) => (d.subject?.trim() ? d.subject.trim() : "Sans matière"))));
    out.sort((a, b) => a.localeCompare(b));
    return ["All", ...out];
  }, [decks]);

  const folderOptions = useMemo(() => {
    const base: Array<{ id: string; label: string }> = [
      { id: "all", label: "Tous" },
      { id: "none", label: "Sans dossier" },
    ];
    const cats = (categories ?? []).map((c: Category) => ({ id: c.id, label: c.name }));
    cats.sort((a, b) => a.label.localeCompare(b.label));
    return [...base, ...cats];
  }, [categories]);

  const activeFolderLabel = useMemo(() => {
    const f = folderOptions.find((x) => x.id === activeFolder);
    return f?.label ?? "Tous";
  }, [folderOptions, activeFolder]);

  const activeSubjectLabel = useMemo(() => {
    return activeSubject === "All" ? "Toutes matières" : activeSubject;
  }, [activeSubject]);

  useEffect(() => {
    refreshCategories().catch(() => null);
  }, [refreshCategories]);

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
    const folder = activeFolder;
    const subject = activeSubject;

    return (rows ?? []).filter((r) => {
      const subjectLabel = r.deck.subject?.trim() ? r.deck.subject.trim() : "Sans matière";
      const okSubject = subject === "All" ? true : subjectLabel === subject;

      const deckFolder = r.deck.categoryId ?? null;
      const okFolder = folder === "all" ? true : folder === "none" ? deckFolder === null : deckFolder === folder;

      const okQuery = q.length === 0 ? true : r.deck.title.toLowerCase().includes(q);

      return okSubject && okFolder && okQuery;
    });
  }, [rows, query, activeSubject, activeFolder]);

  async function submitCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createCategory(name);
      setNewFolderName("");
      setCreateOpen(false);
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(e?.message ?? "Impossible de créer le dossier.");
    }
  }

  function openMoveModal(deck: Deck) {
    setMoveDeck(deck);
    setMoveSearch("");
    setMoveOpen(true);
  }

  async function applyMove(categoryId: string | null) {
    if (!moveDeck) return;
    try {
      await moveDeckToCategory(moveDeck.id, categoryId);
      setMoveOpen(false);
      setMoveDeck(null);
      setMoveSearch("");
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(e?.message ?? "Impossible de déplacer le deck.");
    }
  }

  function showDeckActions(deck: Deck) {
    suppressNextPressForDeckId.current = deck.id;
    setTimeout(() => {
      if (suppressNextPressForDeckId.current === deck.id) suppressNextPressForDeckId.current = null;
    }, 650);

    const options = ["Déplacer vers…", "Annuler"];
    const cancelButtonIndex = 1;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, title: deck.title },
        (buttonIndex) => {
          if (buttonIndex === 0) openMoveModal(deck);
        }
      );
      return;
    }

    Alert.alert(deck.title, "Actions", [
      { text: "Déplacer vers…", onPress: () => openMoveModal(deck) },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  const surface = t.dark ? "#1c2127" : "#ffffff";
  const bg = t.bg;

  const filteredFolderOptions = useMemo(() => {
    const q = folderSearch.trim().toLowerCase();
    if (!q) return folderOptions;
    return folderOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [folderOptions, folderSearch]);

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.toLowerCase().includes(q));
  }, [subjects, subjectSearch]);

  const filteredMoveCategories = useMemo(() => {
    const q = moveSearch.trim().toLowerCase();
    const cats = (categories ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, moveSearch]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: bg }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: "transparent" }]}>
        <Text style={[styles.h1, { color: t.text, fontFamily: t.font.display, fontWeight: "800" }]}>Cours</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => setCreateOpen(true)}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: t.dark ? "#1c2127" : "#fff",
                borderColor: t.dark ? "#334155" : "#E5E7EB",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            hitSlop={10}
          >
            <Ionicons name="folder-outline" size={18} color={t.text} />
            <View style={[styles.iconBadge, { backgroundColor: t.primary }]} />
          </Pressable>

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
              placeholder="Rechercher un sujet ou un cours..."
              placeholderTextColor={t.muted}
              style={[styles.searchInput, { color: t.text, fontFamily: t.font.body }]}
            />
          </View>
        </View>

        {/* Hero Import */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 18 }}>
          <View style={[styles.hero, { backgroundColor: surface, borderColor: t.dark ? "#2a3440" : "#E5E7EB" }]}>
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
              style={({ pressed }) => [styles.heroBtn, { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 }]}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 14 }}>Importer un cours</Text>
            </Pressable>

            <View pointerEvents="none" style={[styles.blob, { right: -30, top: -30, backgroundColor: "rgba(19,127,236,0.10)" }]} />
            <View pointerEvents="none" style={[styles.blob, { left: -30, bottom: -30, backgroundColor: "rgba(19,127,236,0.10)" }]} />
          </View>
        </View>

        {/* Filters (dropdowns) */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pill label={`Dossier: ${activeFolderLabel}`} onPress={() => setFolderPickerOpen(true)} />
            <Pill label={`Matière: ${activeSubjectLabel}`} onPress={() => setSubjectPickerOpen(true)} />
          </View>

          {(activeFolder !== "all" || activeSubject !== "All") ? (
            <Pressable
              onPress={() => {
                setActiveFolder("all");
                setActiveSubject("All");
              }}
              style={({ pressed }) => [{ marginTop: 10, alignSelf: "flex-start", opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={{ color: t.muted, fontFamily: t.font.medium, fontSize: 13 }}>Réinitialiser les filtres</Text>
            </Pressable>
          ) : null}
        </View>

        {/* List title */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>Tes cours</Text>
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
                item.isNew
                  ? {
                      label: "New",
                      colorBg: "rgba(100,116,139,0.10)",
                      colorText: t.dark ? "#94A3B8" : "#64748B",
                    }
                  : item.dueCards > 0
                  ? { label: "Active", colorBg: "rgba(34,197,94,0.10)", colorText: "#22c55e" }
                  : null;

              return (
                <Pressable
                  onPress={() => {
                    if (suppressNextPressForDeckId.current === d.id) return;
                    router.push(`/deck/${d.id}`);
                  }}
                  onLongPress={() => showDeckActions(d)}
                  delayLongPress={300}
                  style={({ pressed }) => [
                    styles.courseCard,
                    {
                      backgroundColor: surface,
                      borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <Cover subject={d.subject} />

                    <View style={{ flex: 1 }}>
                      {/* ✅ Ligne titre + badge (plus de chevauchement) */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontFamily: t.font.display, fontSize: 15 }}>
                          {d.title}
                        </Text>

                        {badge ? (
                          <View
                            style={[
                              styles.badgePill,
                              { backgroundColor: badge.colorBg, borderColor: t.dark ? "#2a3440" : "#E5E7EB" },
                            ]}
                          >
                            <Text style={{ fontSize: 10, letterSpacing: 1, fontFamily: t.font.semibold, color: badge.colorText }}>
                              {badge.label.toUpperCase()}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
                        {d.cards.length} Cards •{" "}
                        <Text
                          style={{
                            color: item.dueCards > 0 ? "#ef4444" : t.muted,
                            fontFamily: item.dueCards > 0 ? t.font.semibold : t.font.body,
                          }}
                        >
                          {item.dueCards} à réviser
                        </Text>
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

      {/* Folder picker (dropdown) */}
      <Modal transparent visible={folderPickerOpen} animationType="fade" onRequestClose={() => setFolderPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setFolderPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: surface, borderColor: t.dark ? "#2a3440" : "#E5E7EB" }]}
            onPress={() => null}
          >
            <View style={styles.sheetHeader}>
              <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Choisir un dossier</Text>
              <Pressable onPress={() => setFolderPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={t.muted} />
              </Pressable>
            </View>

            <View style={[styles.sheetSearch, { borderColor: t.dark ? "#2a3440" : "#E5E7EB", backgroundColor: t.dark ? "#1c2127" : "#fff" }]}>
              <Ionicons name="search" size={16} color={t.muted} />
              <TextInput
                value={folderSearch}
                onChangeText={setFolderSearch}
                placeholder="Rechercher un dossier…"
                placeholderTextColor={t.muted}
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 14 }}
              />
              {folderSearch ? (
                <Pressable onPress={() => setFolderSearch("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={t.muted} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredFolderOptions}
              keyExtractor={(x) => x.id}
              style={{ marginTop: 10, maxHeight: 360 }}
              renderItem={({ item }) => {
                const active = item.id === activeFolder;
                return (
                  <Pressable
                    onPress={() => {
                      setActiveFolder(item.id);
                      setFolderPickerOpen(false);
                      setFolderSearch("");
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                        backgroundColor: pressed ? (t.dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)") : "transparent",
                      },
                    ]}
                  >
                    <Ionicons name={item.id === "none" ? "folder-open-outline" : "folder-outline"} size={18} color={t.muted} />
                    <Text style={{ flex: 1, color: t.text, fontFamily: t.font.medium }}>{item.label}</Text>
                    {active ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Subject picker (dropdown) */}
      <Modal transparent visible={subjectPickerOpen} animationType="fade" onRequestClose={() => setSubjectPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSubjectPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: surface, borderColor: t.dark ? "#2a3440" : "#E5E7EB" }]}
            onPress={() => null}
          >
            <View style={styles.sheetHeader}>
              <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Choisir une matière</Text>
              <Pressable onPress={() => setSubjectPickerOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={20} color={t.muted} />
              </Pressable>
            </View>

            <View style={[styles.sheetSearch, { borderColor: t.dark ? "#2a3440" : "#E5E7EB", backgroundColor: t.dark ? "#1c2127" : "#fff" }]}>
              <Ionicons name="search" size={16} color={t.muted} />
              <TextInput
                value={subjectSearch}
                onChangeText={setSubjectSearch}
                placeholder="Rechercher une matière…"
                placeholderTextColor={t.muted}
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 14 }}
              />
              {subjectSearch ? (
                <Pressable onPress={() => setSubjectSearch("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={t.muted} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={filteredSubjects}
              keyExtractor={(x) => x}
              style={{ marginTop: 10, maxHeight: 360 }}
              renderItem={({ item }) => {
                const active = item === activeSubject;
                const label = item === "All" ? "Toutes matières" : item;
                return (
                  <Pressable
                    onPress={() => {
                      setActiveSubject(item);
                      setSubjectPickerOpen(false);
                      setSubjectSearch("");
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      {
                        borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                        backgroundColor: pressed ? (t.dark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)") : "transparent",
                      },
                    ]}
                  >
                    <Ionicons name={item === "All" ? "layers-outline" : "book-outline"} size={18} color={t.muted} />
                    <Text style={{ flex: 1, color: t.text, fontFamily: t.font.medium }}>{label}</Text>
                    {active ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Folder Modal */}
      <Modal transparent visible={createOpen} animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCreateOpen(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: surface, borderColor: t.dark ? "#2a3440" : "#E5E7EB" }]}
            onPress={() => null}
          >
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Nouveau dossier</Text>
            <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>Exemple : UE10, Anatomie, Kiné…</Text>
            <View style={{ marginTop: 12 }}>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="Nom du dossier"
                placeholderTextColor={t.muted}
                style={[
                  styles.modalInput,
                  { color: t.text, borderColor: t.dark ? "#2a3440" : "#E5E7EB", fontFamily: t.font.body },
                ]}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => setCreateOpen(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: t.dark ? "#1c2127" : "#fff",
                    borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ color: t.text, fontFamily: t.font.display }}>Annuler</Text>
              </Pressable>
              <Pressable
                onPress={submitCreateFolder}
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: t.primary, borderColor: t.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ color: "#fff", fontFamily: t.font.display }}>Créer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Move Deck Modal (with search for many categories) */}
      <Modal transparent visible={moveOpen} animationType="fade" onRequestClose={() => setMoveOpen(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setMoveOpen(false);
            setMoveDeck(null);
            setMoveSearch("");
          }}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: surface, borderColor: t.dark ? "#2a3440" : "#E5E7EB" }]}
            onPress={() => null}
          >
            <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>Déplacer vers</Text>
            <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }} numberOfLines={1}>
              {moveDeck?.title ?? ""}
            </Text>

            <View style={[styles.sheetSearch, { marginTop: 12, borderColor: t.dark ? "#2a3440" : "#E5E7EB", backgroundColor: t.dark ? "#1c2127" : "#fff" }]}>
              <Ionicons name="search" size={16} color={t.muted} />
              <TextInput
                value={moveSearch}
                onChangeText={setMoveSearch}
                placeholder="Rechercher un dossier…"
                placeholderTextColor={t.muted}
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 14 }}
              />
              {moveSearch ? (
                <Pressable onPress={() => setMoveSearch("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={t.muted} />
                </Pressable>
              ) : null}
            </View>

            <View style={{ marginTop: 10, gap: 8, maxHeight: 340 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Pressable
                  onPress={() => applyMove(null)}
                  style={({ pressed }) => [
                    styles.pickRow,
                    { borderColor: t.dark ? "#2a3440" : "#E5E7EB", opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="folder-open-outline" size={18} color={t.muted} />
                  <Text style={{ flex: 1, color: t.text, fontFamily: t.font.medium }}>Sans dossier</Text>
                </Pressable>

                {filteredMoveCategories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => applyMove(c.id)}
                    style={({ pressed }) => [
                      styles.pickRow,
                      { borderColor: t.dark ? "#2a3440" : "#E5E7EB", opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Ionicons name="folder-outline" size={18} color={t.muted} />
                    <Text style={{ flex: 1, color: t.text, fontFamily: t.font.medium }}>{c.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <Pressable
                onPress={() => {
                  setMoveOpen(false);
                  setMoveDeck(null);
                  setMoveSearch("");
                }}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: t.dark ? "#1c2127" : "#fff",
                    borderColor: t.dark ? "#2a3440" : "#E5E7EB",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={{ color: t.text, fontFamily: t.font.display }}>Fermer</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMoveOpen(false);
                  setMoveDeck(null);
                  setMoveSearch("");
                  setCreateOpen(true);
                }}
                style={({ pressed }) => [styles.modalBtn, { backgroundColor: t.primary, borderColor: t.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={{ color: "#fff", fontFamily: t.font.display }}>Nouveau dossier</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  badgePill: {
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

  pill: {
    flex: 1,
    height: 38,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 18,
    justifyContent: "center",
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  modalInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },

  sheet: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    width: "100%",
    alignSelf: "center",
    maxWidth: 520,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetSearch: {
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionRow: {
    height: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  pickRow: {
    height: 46,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
});
