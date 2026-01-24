import { Redirect } from "expo-router";
import React from "react";
import { View } from "react-native";
import { LoadingBlock } from "../src/components/LoadingBlock";
import { useAppStore } from "../src/store/useAppStore";

export default function Entry() {
  const { isReady, onboardingDone } = useAppStore();

  if (!isReady) {
    return (
      <View style={{ padding: 16 }}>
        <LoadingBlock label="Chargement…" />
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/onboarding" />;

  return <Redirect href="/(tabs)" />;
}
