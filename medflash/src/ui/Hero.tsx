import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "./theme";

export function Hero({
  title,
  subtitle,
  rightBadge,
}: {
  title: string;
  subtitle: string;
  rightBadge?: string;
}) {
  return (
    <LinearGradient
      colors={["#1D4ED8", "#3B82F6", "#60A5FA"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{subtitle}</Text>
      </View>

      {rightBadge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeTxt}>{rightBadge}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: theme.radius.lg,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    ...theme.shadow.card,
  },
  title: { color: "white", fontSize: 22, fontWeight: "900" },
  sub: { color: "rgba(255,255,255,0.92)", marginTop: 6, fontWeight: "700" },
  badge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeTxt: { color: "white", fontWeight: "900" },
});
