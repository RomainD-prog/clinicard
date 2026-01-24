import "react-native-gesture-handler";

import { Slot } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useAppStore } from "../src/store/useAppStore";

/**
 * Root layout required by expo-router.
 *
 * The app bootstrap (loading persisted settings, decks, etc.) is triggered here.
 * If this file is missing, `isReady` will never become true and the app will
 * remain on the "Chargement..." screen.
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
        if (alive) useAppStore.setState({ isReady: true } as any);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Slot />
    </GestureHandlerRootView>
  );
}
