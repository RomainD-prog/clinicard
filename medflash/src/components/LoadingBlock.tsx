import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function LoadingBlock({ label = "Chargement..." }: { label?: string }) {
  return (
    <View style={styles.row}>
      <ActivityIndicator />
      <Text style={styles.txt}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  txt: { fontSize: 14, color: "#374151" },
});
