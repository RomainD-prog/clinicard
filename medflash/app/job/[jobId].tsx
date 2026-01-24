import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

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

export default function JobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const { refreshDecks } = useAppStore();

  const [status, setStatus] = useState<"processing" | "done" | "error">("processing");
  const [info, setInfo] = useState("On lit ton document…");
  const [err, setErr] = useState<string | null>(null);

  // petit “fake progress” visuel (backend ne renvoie pas de %)
  const stepLabel = useMemo(() => {
    if (status === "error") return "Erreur";
    if (status === "done") return "Terminé";
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

  return (
    <Screen>
      <Hero title="Génération" subtitle={stepLabel} rightBadge="⚙️" />

      <CardShell title="Statut">
        <Text style={styles.line}>
          Job: <Text style={styles.bold}>{jobId ?? "-"}</Text>
        </Text>
        <Text style={styles.line}>
          État:{" "}
          <Text style={styles.bold}>
            {status === "processing" ? "En cours" : status === "done" ? "OK" : "Erreur"}
          </Text>
        </Text>

        {err ? (
          <Text style={styles.err}>
            {err}
          </Text>
        ) : (
          <Text style={styles.muted}>
            Ne ferme pas l’app pendant la génération (MVP).
          </Text>
        )}

        <View style={{ height: 12 }} />

        {status === "error" ? (
          <View style={{ gap: 10 }}>
            <PrimaryButton title="Revenir aux options" onPress={() => router.replace("/import/options")} />
            <PrimaryButton title="Importer un autre fichier" variant="secondary" onPress={() => router.replace("/import")} />
          </View>
        ) : (
          <PrimaryButton title="Annuler" variant="ghost" onPress={() => router.replace("/import/options")} />
        )}
      </CardShell>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { color: theme.colors.text, fontWeight: "700", marginBottom: 6 },
  bold: { fontWeight: "900" },
  muted: { color: theme.colors.muted, fontWeight: "700", marginTop: 8 },
  err: { color: theme.colors.danger, fontWeight: "800", marginTop: 8 },
});
