import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useStitchTheme } from "./theme";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  const t = useStitchTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: t.dark ? "#1c2127" : "#E5E7EB" }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.item, active && { backgroundColor: t.card }]}
          >
            <Text
              style={[
                styles.txt,
                {
                  color: active ? (t.dark ? "#fff" : t.primary) : t.muted,
                  fontFamily: t.font.semibold,
                },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 40, borderRadius: 12, padding: 4, flexDirection: "row", gap: 6 },
  item: { flex: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txt: { fontSize: 12 },
});
