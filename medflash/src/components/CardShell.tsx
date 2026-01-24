// src/components/CardShell.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../ui/theme";

export function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: {
    ...theme.text.h2,
    color: theme.colors.text,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.lg,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
});
