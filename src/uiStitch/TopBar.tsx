import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStitchTheme } from "./theme";

type TopBarProps = {
  title: string;

  // ✅ Sur les tabs: showBack={false}
  showBack?: boolean;

  // ✅ Optionnel : icône à droite (settings, etc.)
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPressRight?: () => void;

  // Style: "large" pour Library/Home, "small" pour pages internes
  variant?: "large" | "small";
};

export function TopBar({
  title,
  showBack = true,
  rightIcon,
  onPressRight,
  variant = "large",
}: TopBarProps) {
  const t = useStitchTheme();
  const router = useRouter();

  const canGoBack = router.canGoBack();
  const shouldShowBack = showBack && canGoBack;

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: t.bg }}>
      <View
        style={[
          styles.wrap,
          { backgroundColor: t.bg, borderBottomColor: t.border },
          variant === "small" && styles.wrapSmall,
        ]}
      >
        {variant === "small" ? (
          // Mode small : row avec titre centré
        <View style={styles.row}>
          <View style={styles.left}>
            {shouldShowBack ? (
              <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={t.text} />
              </Pressable>
            ) : (
              <View style={styles.iconBtn} />
            )}
          </View>

            <Text
              style={[
                styles.smallTitle,
                { color: t.text, fontFamily: t.font.display },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>

          <View style={styles.right}>
            {rightIcon && onPressRight ? (
              <Pressable onPress={onPressRight} style={styles.iconBtn} hitSlop={12}>
                <Ionicons name={rightIcon} size={20} color={t.text} />
              </Pressable>
            ) : (
              <View style={styles.iconBtn} />
            )}
          </View>
        </View>
        ) : (
          // Mode large : titre à gauche, bouton à droite (comme Library)
          <View style={styles.rowLarge}>
          <Text
            style={[
              styles.bigTitle,
              { color: t.text, fontFamily: t.font.display },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

            <View style={styles.right}>
              {rightIcon && onPressRight ? (
                <Pressable onPress={onPressRight} style={styles.iconBtn} hitSlop={12}>
                  <Ionicons name={rightIcon} size={20} color={t.text} />
                </Pressable>
        ) : null}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wrapSmall: {
    paddingBottom: 6,
  },

  row: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
  },
  rowLarge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { width: 56, alignItems: "flex-start", justifyContent: "center" },
  right: { alignItems: "flex-end", justifyContent: "center" },

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  bigTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.2,
    flex: 1,
  },

  smallTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
});
