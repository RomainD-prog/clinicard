import { useColorScheme } from "react-native";
import { useAppStore } from "../store/useAppStore";

export const colors = {
  primary: "#137fec",
  bgLight: "#f6f7f8",
  bgDark: "#101922",
  cardLight: "#ffffff",
  cardDark: "#1c2127",
  textLight: "#111418",
  textDark: "#ffffff",
  mutedLight: "#6B7280",
  mutedDark: "#9dabb9",
  borderLight: "#E5E7EB",
  borderDark: "rgba(255,255,255,0.06)",
  iconBgDark: "#283039",
};

export function useStitchTheme() {
  const scheme = useColorScheme();
  const system = useColorScheme(); // "dark" | "light" | null
  const darkMode = useAppStore((s) => s.darkMode);
  const dark = darkMode ? true : system === "dark";

  return {
    dark,
    bg: dark ? colors.bgDark : colors.bgLight,
    card: dark ? colors.cardDark : colors.cardLight,
    text: dark ? colors.textDark : colors.textLight,
    muted: dark ? colors.mutedDark : colors.mutedLight,
    border: dark ? colors.borderDark : colors.borderLight,
    primary: colors.primary,
    font: {
      display: "Lexend_700Bold",
      body: "Lexend_400Regular",
      medium: "Lexend_500Medium",
      semibold: "Lexend_600SemiBold",
    },
    radius: {
      lg: 16,
      xl: 20,
    },
  };
}
