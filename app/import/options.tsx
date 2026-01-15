// app/import/options.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

import * as api from "../../src/services/api";
import { useAppStore } from "../../src/store/useAppStore";
import type { GenerationOptions } from "../../src/types/models";
import { useStitchTheme } from "../../src/uiStitch/theme";

function Card({ children }: { children: React.ReactNode }) {
  const t = useStitchTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>{children}</View>;
}

function Stepper({
  label,
  subtitle,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  subtitle?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const t = useStitchTheme();

  function dec() {
    onChange(Math.max(min, value - step));
  }
  function inc() {
    onChange(Math.min(max, value + step));
  }

  return (
    <View style={[styles.row, { borderColor: t.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>{label}</Text>
        {subtitle ? (
          <Text style={{ marginTop: 4, color: t.muted, fontFamily: t.font.body }}>{subtitle}</Text>
        ) : null}
      </View>

      <View style={[styles.stepper, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]}>
        <Pressable onPress={dec} style={styles.stepBtn} hitSlop={10}>
          <Ionicons name="remove" size={18} color={t.text} />
        </Pressable>
        <Text style={{ width: 40, textAlign: "center", color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
          {value}
        </Text>
        <Pressable onPress={inc} style={styles.stepBtn} hitSlop={10}>
          <Ionicons name="add" size={18} color={t.text} />
        </Pressable>
      </View>
    </View>
  );
}

function SegPill({
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
        styles.seg,
        {
          backgroundColor: active ? t.primary : (t.dark ? "#283039" : "#EEF2FF"),
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? "#fff" : t.text, fontFamily: t.font.display }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ImportOptionsScreen() {
  const router = useRouter();
  const t = useStitchTheme();

  const { selectedFile, level, freeImportsRemaining, creditsBalance, decks, isSubscribed } = useAppStore();

  const filename = selectedFile?.name ?? "—";
  const canGenerate = !!selectedFile;

  const [subject, setSubject] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ✅ L'IA décide du nombre de cartes selon le contenu
  const [intensity, setIntensity] = useState<"light" | "standard" | "max">("standard");

  const [planDays, setPlanDays] = useState(7);
  const [medicalStyle, setMedicalStyle] = useState(true);

  const [loading, setLoading] = useState(false);

  // Récupérer toutes les matières uniques des decks existants
  const existingSubjects = useMemo(() => {
    const subjects = decks
      .map(d => d.subject)
      .filter((s): s is string => !!s && s.trim() !== "");
    return Array.from(new Set(subjects)).sort();
  }, [decks]);

  // Filtrer les suggestions selon ce que l'utilisateur tape
  const filteredSuggestions = useMemo(() => {
    if (!subject.trim()) return existingSubjects;
    const query = subject.toLowerCase().trim();
    return existingSubjects.filter(s => s.toLowerCase().includes(query));
  }, [subject, existingSubjects]);

  const loadingLabel = useMemo(() => {
    if (!loading) return null;
    return "Création du job…";
  }, [loading]);

  function goBackSmart() {
    if (router.canGoBack()) router.back();
    else router.replace("/import");
  }

  async function onGenerate() {
    if (!selectedFile) return;

    // ✅ Limite gratuite : 5 decks max
    if (!isSubscribed && decks.length >= 5) {
      Alert.alert(
        "🎓 Limite atteinte",
        "Tu as atteint la limite de 5 decks gratuits. Passe en Premium pour générer autant de cours que tu veux !",
        [
          { text: "Plus tard", style: "cancel" },
          {
            text: "Voir Premium",
            onPress: () => router.push("/paywall"),
          },
        ]
      );
      return;
    }

    try {
      setLoading(true);

      const opts: GenerationOptions = {
        level,
        flashcardsCount: 0, // Sera déterminé par l'IA
        mcqCount: 0, // Sera déterminé par l'IA
        planDays,
        medicalStyle,
        language: "fr",
        subject: subject.trim() ? subject.trim() : undefined,
      };

      // ✅ L'IA décide du nombre selon l'intensité et le contenu
      (opts as any).autoCounts = true;
      (opts as any).intensity = intensity;

      const { jobId } = await api.startGeneration(
        { uri: selectedFile.uri, name: selectedFile.name, mimeType: selectedFile.mimeType, size: selectedFile.size },
        opts
      );

      router.replace(`/job/${jobId}`);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de lancer la génération.");
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.topBar}>
        <Pressable onPress={goBackSmart} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>

        <Text style={{ flex: 1, textAlign: "center", color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
          Options
        </Text>

        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {/* Hero */}
        <Card>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={[styles.heroIcon, { backgroundColor: "rgba(19,127,236,0.12)" }]}>
              <Ionicons name="sparkles-outline" size={20} color={t.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
                Prêt à générer ton deck
              </Text>
              <Text style={{ marginTop: 4, color: t.muted, fontFamily: t.font.body }} numberOfLines={1}>
                {filename}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <View style={[styles.pill, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]}>
              <Text style={{ color: t.text, fontFamily: t.font.display }}>{level}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]}>
              <Text style={{ color: t.text, fontFamily: t.font.display }}>Free: {freeImportsRemaining()}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]}>
              <Text style={{ color: t.text, fontFamily: t.font.display }}>Crédits: {creditsBalance}</Text>
            </View>
          </View>
        </Card>

        {/* Matière */}
        <Text style={[styles.sectionTitle, { color: t.muted, fontFamily: t.font.semibold }]}>MATIÈRE</Text>
        <Card>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
            Où ranger ce cours ?
          </Text>
          <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
            Exemple : Cardio, Anat, Pharmaco… (optionnel)
          </Text>

          <View style={{ position: "relative" }}>
            <View
              style={[
                styles.inputWrap,
                { backgroundColor: t.dark ? "#161a20" : "#F8FAFC", borderColor: t.border },
              ]}
            >
              <Ionicons name="pricetag-outline" size={18} color={t.muted} />
              <TextInput
                value={subject}
                onChangeText={(text) => {
                  setSubject(text);
                  setShowSuggestions(text.trim().length > 0 && filteredSuggestions.length > 0);
                }}
                onFocus={() => {
                  if (subject.trim().length > 0 && filteredSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Matière"
                placeholderTextColor={t.muted}
                style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 15 }}
              />
              {subject.trim().length > 0 && (
                <Pressable onPress={() => { setSubject(""); setShowSuggestions(false); }} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color={t.muted} />
                </Pressable>
              )}
            </View>

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <View
                style={[
                  styles.suggestionsBox,
                  { 
                    backgroundColor: t.card, 
                    borderColor: t.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 5,
                  }
                ]}
              >
                <ScrollView 
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled
                >
                  {filteredSuggestions.map((s, idx) => (
                    <Pressable
                      key={s}
                      onPress={() => {
                        setSubject(s);
                        setShowSuggestions(false);
                      }}
                      style={({ pressed }) => [
                        styles.suggestionItem,
                        { 
                          backgroundColor: pressed ? (t.dark ? "#283039" : "#F8FAFC") : "transparent",
                          borderBottomWidth: idx < filteredSuggestions.length - 1 ? StyleSheet.hairlineWidth : 0,
                          borderBottomColor: t.border,
                        }
                      ]}
                    >
                      <Ionicons name="pricetag" size={16} color={t.primary} />
                      <Text style={{ flex: 1, color: t.text, fontFamily: t.font.body, fontSize: 15 }}>
                        {s}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={t.muted} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </Card>

        {/* Contenu */}
        <Text style={[styles.sectionTitle, { color: t.muted, fontFamily: t.font.semibold }]}>CONTENU</Text>
        <Card>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
            Intensité de génération
          </Text>
          <Text style={{ marginTop: 6, color: t.muted, fontFamily: t.font.body }}>
            L'IA génère autant de flashcards que nécessaire selon le contenu et l'intensité choisie.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <SegPill label="Light" active={intensity === "light"} onPress={() => setIntensity("light")} />
            <SegPill label="Standard" active={intensity === "standard"} onPress={() => setIntensity("standard")} />
            <SegPill label="Max" active={intensity === "max"} onPress={() => setIntensity("max")} />
          </View>

          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 13 }}>•</Text>
              <Text style={{ flex: 1, color: t.muted, fontFamily: t.font.body, fontSize: 13 }}>
                <Text style={{ fontFamily: t.font.semibold }}>Light</Text> : ~6 flashcards/page + QCM proportionnels
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 13 }}>•</Text>
              <Text style={{ flex: 1, color: t.muted, fontFamily: t.font.body, fontSize: 13 }}>
                <Text style={{ fontFamily: t.font.semibold }}>Standard</Text> : ~10 flashcards/page (recommandé)
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 13 }}>•</Text>
              <Text style={{ flex: 1, color: t.muted, fontFamily: t.font.body, fontSize: 13 }}>
                <Text style={{ fontFamily: t.font.semibold }}>Max</Text> : ~14 flashcards/page (cours denses)
              </Text>
            </View>
          </View>
        </Card>

        {/* Style */}
        <Text style={[styles.sectionTitle, { color: t.muted, fontFamily: t.font.semibold }]}>STYLE</Text>
        <Card>
          <View style={[styles.row, { borderColor: t.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>
                Style médical (recommandé)
              </Text>
              <Text style={{ marginTop: 4, color: t.muted, fontFamily: t.font.body }}>
                Réponses plus “cours / ECNi / PASS”.
              </Text>
            </View>
            <Switch
              value={medicalStyle}
              onValueChange={setMedicalStyle}
              trackColor={{ false: t.dark ? "#283039" : "#E5E7EB", true: t.primary }}
              thumbColor={"#fff"}
            />
          </View>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          <Stepper
            label="Plan (jours)"
            subtitle="Petit plan de révision généré avec le deck."
            value={planDays}
            onChange={setPlanDays}
            min={0}
            max={14}
            step={1}
          />
        </Card>

        {/* CTA */}
        <Pressable
          onPress={onGenerate}
          disabled={!canGenerate || loading}
          style={({ pressed }) => [
            styles.generateBtn,
            {
              backgroundColor: t.primary,
              opacity: !canGenerate || loading ? 0.45 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 16 }}>
            {loading ? "Génération…" : "Générer"}
          </Text>
          <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
        </Pressable>

        {loadingLabel ? (
          <Text style={{ marginTop: 10, textAlign: "center", color: t.muted, fontFamily: t.font.body }}>
            {loadingLabel}
          </Text>
        ) : null}
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
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginTop: 14,
  },

  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 8,
    fontSize: 12,
    letterSpacing: 1,
  },

  inputWrap: {
    marginTop: 12,
    height: 52,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  row: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sep: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },

  stepper: {
    height: 42,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  generateBtn: {
    marginTop: 16,
    height: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  seg: { flex: 1, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },

  suggestionsBox: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    zIndex: 1000,
  },

  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
