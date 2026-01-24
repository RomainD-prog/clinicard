import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useStitchTheme } from "./theme";

export function HeroStreakCard({ streak, subtitle }: { streak: number; subtitle: string }) {
  const t = useStitchTheme();

  return (
    <LinearGradient
      colors={t.dark ? ["#1c2127", "#161a20"] : ["#ffffff", "#f8fafc"]}
      style={styles.heroOuter}
    >
      <View style={[styles.heroInner, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.heroTag}>
            <Ionicons name="flame" size={16} color="#f97316" />
            <Text style={[styles.heroTagTxt, { color: "#f97316", fontFamily: t.font.semibold }]}>
              Série actuelle
            </Text>
          </View>

          <Text style={[styles.heroBig, { color: t.text, fontFamily: t.font.display }]}>
            {streak} jours
          </Text>

          <Text style={[styles.heroSub, { color: t.muted, fontFamily: t.font.medium }]}>
            {subtitle}
          </Text>
        </View>

        <View style={[styles.heroIcon, { borderColor: t.border }]}>
          <Ionicons name="calendar" size={26} color="#f97316" />
        </View>
      </View>
    </LinearGradient>
  );
}

export function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
}) {
  const t = useStitchTheme();
  return (
    <View style={[styles.tile, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={[styles.tileIcon, { backgroundColor: t.dark ? "rgba(255,255,255,0.06)" : "#EFF6FF" }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text 
          style={[styles.tileLabel, { color: t.muted, fontFamily: t.font.semibold }]} 
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      </View>
      <Text style={[styles.tileValue, { color: t.text, fontFamily: t.font.display }]}>{value}</Text>
    </View>
  );
}

export function FABBar({ title, onPress }: { title: string; onPress?: () => void }) {
    const t = useStitchTheme();
    return (
      <View style={[styles.fabWrap, { backgroundColor: "transparent" }]}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: t.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="play-circle" size={22} color="#fff" />
          <Text style={[styles.fabTxt, { fontFamily: t.font.display }]}>{title}</Text>
        </Pressable>
      </View>
    );
}

const styles = StyleSheet.create({
  heroOuter: { borderRadius: 20, padding: 2, marginHorizontal: 16, marginTop: 12 },
  heroInner: { borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: StyleSheet.hairlineWidth },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  heroTagTxt: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  heroBig: { fontSize: 32, lineHeight: 38 },
  heroSub: { fontSize: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 4 },

  tile: { flex: 1, borderRadius: 18, padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  tileIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  tileValue: { fontSize: 22 },

  fabWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16 },
  fab: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  fabTxt: { color: "#fff", fontSize: 16 },
});
