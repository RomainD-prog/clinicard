import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { configurePurchases } from "../src/services/purchases";

import { useAppStore } from "../src/store/useAppStore";

/**
 * Root layout (expo-router).
 *
 * IMPORTANT:
 * - Only <Stack.Screen /> children inside <Stack /> (avoids expo-router warnings/crashes).
 * - We bootstrap the app once, but we don't conditionally add/remove children inside the Stack.
 */
export default function RootLayout() {
  const bootstrap = useAppStore((s: any) => s.bootstrap);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await configurePurchases();
        await bootstrap();
      } catch (e) {
        console.warn("[RootLayout] bootstrap failed:", e);
        // Unblock the UI even if bootstrap fails.
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
        {/* Root */}
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />

        {/* Auth */}
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="auth/reset" />

        {/* Onboarding (folder route: app/onboarding/index) */}
        <Stack.Screen name="onboarding/index" />

        {/* Import flow (folder route managed by app/import/_layout) */}
        <Stack.Screen name="import" />

        {/* Review */}
        <Stack.Screen name="review/session" />

        {/* Deck */}
        <Stack.Screen name="deck/[deckId]" />
        <Stack.Screen name="deck/[deckId]/cards" />
        <Stack.Screen name="deck/[deckId]/card-editor" />
        <Stack.Screen name="deck/[deckId]/quiz" />
        <Stack.Screen name="deck/[deckId]/quiz-history" />
        <Stack.Screen name="deck/[deckId]/stats" />

        {/* Jobs */}
        <Stack.Screen name="job/[jobId]" />

        {/* Misc */}
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
