import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CardShell } from "../../src/components/CardShell";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { Hero } from "../../src/ui/Hero";
import { Screen } from "../../src/ui/Screen";
import { theme } from "../../src/ui/theme";

import * as api from "../../src/services/api";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type StepKey = "upload" | "extract" | "generate";
type Step = { key: StepKey; label: string; icon: keyof typeof Ionicons.glyphMap };

const STEPS: Step[] = [
  { key: "upload", label: "Upload reçu", icon: "cloud-done-outline" },
  { key: "extract", label: "Extraction du texte", icon: "document-text-outline" },
  { key: "generate", label: "Création du deck", icon: "sparkles-outline" },
];

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function progressFromElapsed(ms: number) {
  // Fake but “smooth” progress: quickly ramps up, then slows and caps at 0.92 until done.
  // 0..2s -> 0..0.25
  // 2..8s -> 0.25..0.70
  // 8..30s -> 0.70..0.92
  if (ms <= 2000) return (ms / 2000) * 0.25;
  if (ms <= 8000) return 0.25 + ((ms - 2000) / 6000) * 0.45;
  if (ms <= 30000) return 0.70 + ((ms - 8000) / 22000) * 0.22;
  return 0.92;
}

function stepFromElapsed(ms: number): StepKey {
  if (ms < 2000) return "upload";
  if (ms < 8000) return "extract";
  return "generate";
}

function StepRow({
  label,
  icon,
  state,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  state: "done" | "active" | "todo";
}) {
  const isActive = state === "active";
  const isDone = state === "done";
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepIcon,
          {
            backgroundColor: isDone
              ? "rgba(34,197,94,0.12)"
              : isActive
                ? "rgba(19,127,236,0.12)"
                : "rgba(148,163,184,0.10)",
          },
        ]}
      >
        <Ionicons
          name={isDone ? "checkmark" : icon}
          size={18}
          color={isDone ? theme.colors.success : isActive ? theme.colors.primary : theme.colors.muted}
        />
      </View>
      <Text
        style={[
          styles.stepText,
          {
            color: isDone ? theme.colors.text : isActive ? theme.colors.text : theme.colors.muted,
            fontWeight: isActive ? "900" : "800",
          },
        ]}
      >
        {label}
      </Text>
      {isActive ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
    </View>
  );
}

export default function JobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const { refreshDecks } = useAppStore();

  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [info, setInfo] = useState("On lit ton document…");
  const [err, setErr] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Smooth, looping “gear” rotation (feels alive during wait)
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [spin]);

  // Timer for fake progress + step labels
  useEffect(() => {
    if (status !== "processing") return;
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 250);
    return () => clearInterval(id);
  }, [status]);

  const progress01 = useMemo(() => {
    if (status === "done") return 1;
    if (status === "error") return 0;
    return clamp01(progressFromElapsed(elapsedMs));
  }, [elapsedMs, status]);

  const activeStep = useMemo(() => {
    if (status === "done") return "generate" as StepKey;
    if (status === "error") return "generate" as StepKey;
    return stepFromElapsed(elapsedMs);
  }, [elapsedMs, status]);

  const subtitle = useMemo(() => {
    if (status === "error") return "Une erreur est survenue";
    if (status === "done") return "Deck prêt ✅";
    return info;
  }, [status, info]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!jobId) return;

      try {
        setStatus("processing");
        setErr(null);

        const start = Date.now();

        while (!cancelled) {
          const elapsed = Date.now() - start;
          if (elapsed < 2000) setInfo("Upload reçu ✅");
          else if (elapsed < 8000) setInfo("Extraction du texte…");
          else setInfo("Génération des flashcards & QCM…");

          const j = await api.getJob(jobId);

          if (j.status === "done") {
            setStatus("done");
            const deckId = j.deckId;
            if (!deckId) throw new Error("Job terminé mais deckId manquant.");

            const deck = await api.getDeck(deckId);

            // ✅ Patch depuis le job local (options)
            const localJob = await repo.getJob(jobId);
            const opts = localJob?.options;

            const patchedDeck = {
              ...deck,
              level: (opts as any)?.level ?? deck.level,
              subject: (opts as any)?.subject ?? deck.subject,
              categoryId: (opts as any)?.categoryId ?? deck.categoryId ?? null,
              sourceFilename: localJob?.sourceFilename ?? deck.sourceFilename,
            };

            await repo.saveDeck(patchedDeck);
            await refreshDecks();

            router.replace(`/deck/${deck.id}`);
            return;
          }

          if (j.status === "error") {
            setStatus("error");
            setErr(j.errorMessage ?? "Erreur inconnue côté backend");
            return;
          }

          await sleep(1200);
        }
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setErr(e?.message ?? "Erreur inconnue");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, router, refreshDecks]);

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Screen>
      <Hero title="Génération" subtitle={subtitle} rightBadge="⚙️" />

      <CardShell title="Création de ton deck">
        {/* Top visual */}
        <View style={styles.topVisual}>
          <View style={styles.iconBubble}>
            {status === "error" ? (
              <Ionicons name="warning-outline" size={22} color={theme.colors.danger} />
            ) : status === "done" ? (
              <Ionicons name="checkmark" size={22} color={theme.colors.success} />
            ) : (
              <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                <Ionicons name="settings-outline" size={22} color={theme.colors.primary} />
              </Animated.View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.bigTitle}>
              {status === "error" ? "Oups…" : status === "done" ? "Terminé" : "En cours"}
            </Text>
            <Text style={styles.smallText}>
              {status === "error"
                ? "Impossible de générer le deck pour le moment."
                : "Ça peut prendre quelques secondes selon la taille du cours."}
            </Text>
          </View>
        </View>

        {/* Progress */}
        {status !== "error" ? (
          <View style={{ marginTop: 12 }}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress01 * 100)}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              {status === "done" ? "100%" : `≈ ${Math.round(progress01 * 100)}%`}
            </Text>
          </View>
        ) : null}

        {/* Steps */}
        <View style={{ marginTop: 12 }}>
          {STEPS.map((s) => {
            const state: "done" | "active" | "todo" =
              status === "done"
                ? "done"
                : s.key === activeStep
                  ? "active"
                  : ("upload" === activeStep && s.key !== "upload") ||
                      ("extract" === activeStep && s.key === "generate")
                    ? "todo"
                    : s.key === "upload" && activeStep !== "upload"
                      ? "done"
                      : s.key === "extract" && activeStep === "generate"
                        ? "done"
                        : "todo";

            return <StepRow key={s.key} label={s.label} icon={s.icon} state={state} />;
          })}
        </View>

        {/* Error text */}
        {err ? <Text style={styles.err}>{err}</Text> : null}

        {/* Details toggle */}
        {jobId ? (
          <View style={{ marginTop: 10 }}>
            <Pressable
              onPress={() => setShowDetails((v) => !v)}
              style={({ pressed }) => [styles.detailsToggle, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={16} color={theme.colors.muted} />
              <Text style={styles.detailsToggleText}>{showDetails ? "Masquer les détails" : "Afficher les détails"}</Text>
            </Pressable>

            {showDetails ? (
              <View style={styles.detailsCard}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <Text style={styles.detailsLabel}>Job ID</Text>
                  <Pressable
                    onPress={async () => {
                      await Clipboard.setStringAsync(String(jobId));
                    }}
                    hitSlop={10}
                    style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.copyBtnText}>Copier</Text>
                  </Pressable>
                </View>
                <Text style={styles.jobId} numberOfLines={2}>
                  {jobId}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Actions */}
        <View style={{ marginTop: 12 }}>
          {status === "error" ? (
            <View style={{ gap: 10 }}>
              <PrimaryButton title="Revenir aux options" onPress={() => router.replace("/import/options")} />
              <PrimaryButton title="Importer un autre fichier" variant="secondary" onPress={() => router.replace("/import")} />
            </View>
          ) : (
            <PrimaryButton title="Annuler" variant="ghost" onPress={() => router.replace("/import/options")} />
          )}
        </View>

        {/* Small reassurance */}
        {status === "processing" ? (
          <Text style={styles.footerNote}>Garde l’app ouverte pendant la génération.</Text>
        ) : null}
      </CardShell>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topVisual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(19,127,236,0.10)",
  },
  bigTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  smallText: {
    marginTop: 2,
    color: theme.colors.muted,
    fontWeight: "700",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  progressHint: {
    marginTop: 8,
    color: theme.colors.muted,
    fontWeight: "800",
    textAlign: "right",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  stepIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
  },
  err: {
    marginTop: 10,
    color: theme.colors.danger,
    fontWeight: "900",
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  detailsToggleText: {
    color: theme.colors.muted,
    fontWeight: "800",
  },
  detailsCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  detailsLabel: {
    color: theme.colors.muted,
    fontWeight: "900",
  },
  jobId: {
    marginTop: 6,
    color: theme.colors.text,
    fontWeight: "800",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(19,127,236,0.10)",
  },
  copyBtnText: {
    color: theme.colors.primary,
    fontWeight: "900",
  },
  footerNote: {
    marginTop: 10,
    color: theme.colors.muted,
    fontWeight: "700",
    textAlign: "center",
  },
});
