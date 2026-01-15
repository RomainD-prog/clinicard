import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "./theme";

export function StatPill({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: "blue" | "green" | "gray";
}) {
  return (
    <View style={[styles.pill, toneStyles[tone]]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  value: { fontWeight: "900", fontSize: 16, color: theme.colors.text },
  label: { marginTop: 2, color: theme.colors.muted, fontWeight: "700", fontSize: 12 },
});

const toneStyles = StyleSheet.create({
  blue: { backgroundColor: theme.colors.softBlue },
  green: { backgroundColor: theme.colors.softGreen },
  gray: { backgroundColor: "rgba(15, 23, 42, 0.06)" },
});
