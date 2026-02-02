import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStitchTheme } from "./theme";

export function AppHeader({
  title,
  rightIcon,
  onRightPress,
  showBack = true,
}: {
  title: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  showBack?: boolean;
}) {
  const t = useStitchTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(6, insets.top), backgroundColor: t.bg }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="chevron-back" size={24} color={t.text} />
            </Pressable>
          ) : null}
        </View>

        <Text style={[styles.title, { color: t.text, fontFamily: t.font.display }]} numberOfLines={1}>
          {title}
        </Text>

        <View style={[styles.side, { alignItems: "flex-end" }]}>
          {rightIcon ? (
            <Pressable
              onPress={onRightPress}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name={rightIcon} size={20} color={t.text} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={[styles.divider, { backgroundColor: t.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
  },
  row: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    width: 44,
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.9,
  },
});
