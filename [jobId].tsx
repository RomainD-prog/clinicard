import { Ionicons } from "@expo/vector-icons";
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
import { Screen } from "../../src/ui/Screen";
import { theme } from "../../src/ui/theme";

import * as api from "../../src/services/api";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function JobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const { refreshDecks } = useAppStore();

  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [info, setInfo] = useState("On lit ton document…");
  const [err, setErr] = useState<string | null>(null);
  const [showTech, setShowTech] = useState(false);

  // petites animations (sans dépendances externes)
  const [dotCount, setDotCount] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const dots = useMemo(() => {
    if (status !== "processing") return "";
    return ".".repeat(dotCount);
  }, [dotCount, status]);

  const stepIndex = useMemo(() => {
    if (status === "error") return 0;
    if (status === "done") return 3;
    const s = String(info ?? "").toLowerCase();
    if (s.includes("upload")) return 0;
    if (s.includes("extract")) return 1;
    if (s.includes("génération") || s.includes("generation") || s.includes("flashcards") || s.includes("qcm")) return 2;
    return 0;
  }, [status, info]);

  // petit “fake progress” visuel (backend ne renvoie pas de %)
  const stepLabel = useMemo(() => {
    if (status === "error") return "Erreur";
    if (status === "done") return "Terminé";
    return info;
  }, [status, info]);

  // Dots “...” pour rendre l'attente moins statique
  useEffect(() => {
    if (status !== "processing") return;
    const id = setInterval(() => setDotCount((d) => (d + 1) % 4), 450);
    return () => clearInterval(id);
  }, [status]);

  // Animation légère (spinner + pulse)
  useEffect(() => {
    if (status !== "processing") return;

    spin.setValue(0);
    pulse.setValue(0);

    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );

    spinAnim.start();
    pulseAnim.start();

    return () => {
      // stop() existe sur l'animation retournée par loop()
      // @ts-expect-error - stop est bien présent runtime
      spinAnim.stop?.();
      // @ts-expect-error - stop est bien présent runtime
      pulseAnim.stop?.();
    };
  }, [pulse, spin, status]);

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
          else if (elapsed < 6000) setInfo("Extraction du texte…");
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
              level: opts?.level ?? deck.level,
              subject: opts?.subject ?? deck.subject,
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

  const spinDeg = useMemo(
    () => spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }),
    [spin]
  );
  const pulseScale = useMemo(
    () => pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }),
    [pulse]
  );

  const steps = useMemo(
    () => [
      { label: "Lecture du PDF", icon: "document-text-outline" as const },
      { label: "Extraction des notions", icon: "sparkles-outline" as const },
      { label: "Génération des flashcards", icon: "layers-outline" as const },
      { label: "Finalisation", icon: "checkmark-done-outline" as const },
    ],
    []
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Animated.View style={[styles.orb, { transform: [{ scale: pulseScale }] }]}>
          <Animated.View style={[styles.orbRing, { transform: [{ rotate: spinDeg }] }]} />
          <View style={styles.orbInner}>
            <Ionicons name="sparkles" size={26} color={theme.colors.primary} />
          </View>
        </Animated.View>

        <Text style={styles.h1}>Génération en cours{dots}</Text>
        <Text style={styles.sub}>
          On prépare ton deck. En général 20–60s selon la taille du PDF.
        </Text>
      </View>

      <CardShell title="Progression">
        <View style={styles.statusRow}>
          <ActivityIndicator
            size={Platform.OS === "ios" ? "small" : 18}
            color={theme.colors.primary}
          />
          <Text style={styles.statusText}>{stepLabel}{dots}</Text>
        </View>

        <View style={{ height: 10 }} />

        <View style={{ gap: 10 }}>
          {steps.map((s, idx) => {
            const isDone = status === "done" ? true : idx < stepIndex;
            const isActive = status === "processing" && idx === stepIndex;
            const icon = isDone
              ? ("checkmark-circle" as const)
              : isActive
                ? ("time-outline" as const)
                : ("ellipse-outline" as const);

            const color = isDone
              ? theme.colors.success
              : isActive
                ? theme.colors.primary
                : theme.colors.muted;

            return (
              <View key={s.label} style={styles.stepRow}>
                <Ionicons name={icon} size={18} color={color} />
                <Ionicons name={s.icon} size={18} color={theme.colors.text} />
                <Text style={[styles.stepText, { color: isActive ? theme.colors.text : theme.colors.muted }]}>
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 12 }} />

        {err ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.errTitle}>Une erreur est survenue</Text>
            <Text style={styles.err}>{err}</Text>
            <Text style={styles.errHint}>Astuce : réessaie ou importe un PDF plus léger.</Text>

            <Pressable
              onPress={() => setShowTech((s) => !s)}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Text style={[styles.errHint, { textDecorationLine: "underline" }]}>
                {showTech ? "Masquer les détails techniques" : "Afficher les détails techniques"}
              </Text>
            </Pressable>

            {showTech ? (
              <Text style={styles.tech}>
                Job ID: {jobId}\nStatus: {status}\nInfo: {info}
              </Text>
            ) : null}

            <PrimaryButton title="Revenir aux options" onPress={() => router.replace("/import/options")} />
            <PrimaryButton title="Importer un autre fichier" variant="secondary" onPress={() => router.replace("/import")} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={styles.muted}>
              Tu peux laisser l’app ouverte pendant la génération.
            </Text>
            <PrimaryButton title="Annuler" variant="ghost" onPress={() => router.replace("/import/options")} />
          </View>
        )}
      </CardShell>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 8,
    alignItems: "center",
  },
  orb: {
    width: 78,
    height: 78,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  orbRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(59,130,246,0.20)",
  },
  orbInner: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  h1: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },
  sub: {
    color: theme.colors.muted,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusText: { color: theme.colors.text, fontWeight: "900" },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
  },
  stepText: {
    fontWeight: "800",
    flex: 1,
  },
  muted: { color: theme.colors.muted, fontWeight: "700" },
  errTitle: { color: theme.colors.danger, fontWeight: "900" },
  err: { color: theme.colors.danger, fontWeight: "800" },
  errHint: { color: theme.colors.muted, fontWeight: "700", fontSize: 12 },
});
