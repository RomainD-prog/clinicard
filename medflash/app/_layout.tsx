import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAppStore } from "../src/store/useAppStore";

/**
 * Root layout required by expo-router.
 *
 * IMPORTANT:
 * - Keep ONLY <Stack.Screen /> as children of <Stack />.
 * - This layout triggers the app bootstrap (persisted settings, decks, etc.).
 */
export default function RootLayout() {
  const bootstrap = useAppStore((s: any) => s.bootstrap);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await bootstrap();
      } catch (e) {
        console.warn("[RootLayout] bootstrap failed:", e);
        // Fallback: avoid an infinite loading screen if bootstrap fails.
        if (alive) useAppStore.setState({ isReady: true } as any);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Main tab navigator */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Flows displayed on top of tabs */}
        <Stack.Screen name="import" options={{ headerShown: false }} />
        <Stack.Screen name="import/options" options={{ headerShown: false }} />

        {/* Auth */}
        <Stack.Screen name="auth" options={{ headerShown: false }} />

        {/* Other top-level screens */}
        <Stack.Screen name="profile-settings" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
