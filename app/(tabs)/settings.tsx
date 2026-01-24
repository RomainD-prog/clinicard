import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";
import { useStitchTheme } from "../../src/uiStitch/theme";

const PRIVACY_POLICY_URL = "https://github.com/romaind-prog/clinicard";
const FEEDBACK_URL = "https://github.com/romaind-prog/clinicard/issues";

type ReviewStatsExt = {
  streak: number;
  doneToday: number;
  lastActiveDay: string | null;
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLetterFR(d: Date) {
  // JS: 0=Sun ... 6=Sat
  const map = ["D", "L", "M", "M", "J", "V", "S"];
  return map[d.getDay()] ?? "?";
}

function ActionCard({
  icon,
  title,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  right?: React.ReactNode;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        {
          backgroundColor: t.card,
          borderColor: t.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.actionLeft}>
        <View
          style={[
            styles.actionIcon,
            { backgroundColor: t.dark ? "rgba(19,127,236,0.15)" : "rgba(19,127,236,0.10)" },
          ]}
        >
          <Ionicons name={icon} size={20} color={t.primary} />
        </View>
        <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 16 }}>{title}</Text>
      </View>

      <View style={styles.actionRight}>
        {right ?? <Ionicons name="chevron-forward" size={18} color={t.muted} />}
      </View>
    </Pressable>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const t = useStitchTheme();
  return (
    <Text style={{ marginTop: 22, marginBottom: 10, color: t.text, fontFamily: t.font.display, fontSize: 22 }}>
      {children}
    </Text>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useStitchTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
      <Text style={{ color: t.muted, fontFamily: t.font.medium, fontSize: 14, marginTop: 10 }}>{label}</Text>
    </Pressable>
  );
}

function StreakWeekCard({ streak, lastActiveDay }: { streak: number; lastActiveDay: string | null }) {
  const t = useStitchTheme();

  const today = useMemo(() => new Date(), []);
  const end = lastActiveDay ?? null;
  const start = useMemo(() => {
    if (!end || !streak || streak <= 0) return null;
    const endDate = new Date(end);
    if (Number.isNaN(endDate.getTime())) return null;
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (streak - 1));
    return ymd(startDate);
  }, [end, streak]);

  const endYmd = useMemo(() => {
    if (!end) return null;
    // end is already a YYYY-MM-DD string in repo
    return end;
  }, [end]);

  const days = useMemo(() => {
    const arr: Date[] = [];
    const base = new Date(today);
    base.setHours(12, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, [today]);

  return (
    <View style={[styles.cardBox, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 16, paddingBottom: 12 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.dark ? "rgba(249,115,22,0.18)" : "rgba(249,115,22,0.14)",
          }}
        >
          <Ionicons name="flame" size={20} color="#f97316" />
        </View>
        <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 18 }}>{streak} jour{streak > 1 ? "s" : ""} série</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: t.dark ? "rgba(255,255,255,0.06)" : "#E5E7EB" }]} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 14, paddingTop: 12 }}>
        {days.map((d) => {
          const dYmd = ymd(d);
          const inStreak = !!start && !!endYmd && dYmd >= start && dYmd <= endYmd;
          const isToday = dYmd === ymd(new Date());
          return (
            <View key={dYmd} style={{ alignItems: "center", width: 38 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: inStreak ? "rgba(249,115,22,0.35)" : t.border,
                  backgroundColor: inStreak ? "rgba(249,115,22,0.15)" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: inStreak ? "#f97316" : t.muted,
                    fontFamily: t.font.display,
                    fontSize: 13,
                  }}
                >
                  {d.getDate()}
                </Text>
              </View>
              <Text style={{ marginTop: 6, color: isToday ? t.text : t.muted, fontFamily: t.font.medium, fontSize: 12 }}>
                {dayLetterFR(d)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: t.dark ? "rgba(19,127,236,0.15)" : "rgba(19,127,236,0.10)",
          }}
        >
          <Ionicons name={icon} size={20} color={t.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.muted, fontFamily: t.font.medium, fontSize: 12 }}>{label}</Text>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 22, marginTop: 2 }}>{value}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ProfileTabScreen() {
  const t = useStitchTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isSubscribed = useAppStore((s) => s.isSubscribed);
  const reviewStats = useAppStore((s) => s.reviewStats);
  const decks = useAppStore((s) => s.decks);

  const [extStats, setExtStats] = useState<ReviewStatsExt>({
    streak: reviewStats.streak,
    doneToday: reviewStats.doneToday,
    lastActiveDay: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await repo.getReviewStats();
        if (!alive) return;
        setExtStats({ streak: s.streak, doneToday: s.doneToday, lastActiveDay: s.lastActiveDay });
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [reviewStats.streak, reviewStats.doneToday]);

  const version =
    (Constants.expoConfig as any)?.version ??
    (Constants.manifest as any)?.version ??
    (Constants.expoConfig as any)?.runtimeVersion ??
    "";

  async function onInvite() {
    try {
      await Share.share({
        message:
          "Je révise avec CliniCard (flashcards + QCM). Tu veux tester ?\n\n" + PRIVACY_POLICY_URL,
      });
    } catch {
      // ignore
    }
  }

  async function onFeedback() {
    try {
      await Linking.openURL(FEEDBACK_URL);
    } catch {
      Alert.alert("Impossible d'ouvrir le lien");
    }
  }

  async function openPrivacyPolicy() {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert("Impossible d'ouvrir le lien");
    }
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(10, insets.top + 6),
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 18,
        }}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 40, letterSpacing: -0.5 }}>
            Profil
          </Text>

          <Pressable
            onPress={() => router.push("/paywall")}
            style={({ pressed }) => [
              styles.upgradeBtn,
              {
                backgroundColor: isSubscribed ? (t.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "#6D28D9",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Ionicons name="sparkles" size={18} color={isSubscribed ? t.text : "#fff"} />
            <Text
              style={{
                color: isSubscribed ? t.text : "#fff",
                fontFamily: t.font.display,
                fontSize: 15,
              }}
            >
              {isSubscribed ? "Premium" : "Mettre à niveau"}
            </Text>
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={{ marginTop: 14, gap: 12 }}>
          <ActionCard
            icon="settings-outline"
            title="Paramètres du profil"
            onPress={() => router.push("/profile-settings")}
          />
          <ActionCard icon="person-add-outline" title="Inviter des amis" onPress={onInvite} />
          <ActionCard icon="chatbubble-ellipses-outline" title="Commentaires" onPress={onFeedback} />
        </View>

        {/* Streak */}
        <SectionTitle>Série</SectionTitle>
        <StreakWeekCard streak={extStats.streak ?? 0} lastActiveDay={extStats.lastActiveDay} />

        {/* Goals */}
        <SectionTitle>Objectifs quotidiens</SectionTitle>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <StatTile label="Révisions aujourd'hui" value={String(extStats.doneToday ?? 0)} icon="time-outline" />
          <StatTile label="Decks" value={String(decks?.length ?? 0)} icon="albums-outline" />
        </View>

        {/* Links */}
        <View style={{ marginTop: 26 }}>
          <LinkRow label="Politique de confidentialité" onPress={openPrivacyPolicy} />
          <LinkRow label="Signaler un bug / Idées" onPress={onFeedback} />
          <Text style={{ marginTop: 16, color: t.muted, fontFamily: t.font.body, fontSize: 12 }}>
            {version ? `Version ${version}` : ""}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
  },

  actionCard: {
    height: 72,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  actionIcon: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionRight: { alignItems: "center", justifyContent: "center" },

  cardBox: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  divider: { height: StyleSheet.hairlineWidth },

  statTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
});
