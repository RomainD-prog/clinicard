import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { FREE_IMPORTS_LIMIT, MOCK_API } from "../../src/config/env";
import { CLOUD_SYNC_ENABLED } from "../../src/config/supabase";
import * as authService from "../../src/services/authService";
import {
  cancelScheduled,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../../src/services/notifications";
import * as repo from "../../src/storage/repo";
import { useAppStore } from "../../src/store/useAppStore";

import { useStitchTheme } from "../../src/uiStitch/theme";
import { TopBar } from "../../src/uiStitch/TopBar";

type ThemeMode = "system" | "light" | "dark";

function SectionTitle({ children }: { children: string }) {
  const t = useStitchTheme();
  return (
    <Text
      style={[
        styles.sectionTitle,
        { color: t.muted, fontFamily: t.font.semibold },
      ]}
    >
      {children}
    </Text>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  const t = useStitchTheme();
  return (
    <View style={[styles.group, { backgroundColor: t.card, borderColor: t.border }]}>
      {children}
    </View>
  );
}

function Divider() {
  const t = useStitchTheme();
  return <View style={[styles.divider, { backgroundColor: t.border }]} />;
}

function Row({
  icon,
  title,
  subtitle,
  right,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
}) {
  const t = useStitchTheme();
  const Container: any = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={({ pressed }: any) => [
        styles.row,
        onPress && { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: t.dark ? "#283039" : "#EEF2FF" },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={danger ? "#ef4444" : t.text}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: danger ? "#ef4444" : t.text,
              fontFamily: t.font.body,
              fontSize: 16, // ✅ 16 comme ton HTML
              lineHeight: 20,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={{
                marginTop: 4,
                color: t.muted,
                fontFamily: t.font.body,
                fontSize: 12,
                lineHeight: 16,
              }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {right ? <View style={styles.right}>{right}</View> : null}
    </Container>
  );
}

function RightValue({ children }: { children: React.ReactNode }) {
  const t = useStitchTheme();
  return (
    <Text style={{ color: t.muted, fontFamily: t.font.body, fontSize: 15 }}>
      {children}
    </Text>
  );
}

/** ✅ petit “segmented” ultra simple pour le thème */
function ModePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const t = useStitchTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modePill,
        {
          backgroundColor: active ? t.primary : (t.dark ? "#283039" : "#EEF2FF"),
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : t.text,
          fontFamily: t.font.display,
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const t = useStitchTheme();
  const router = useRouter();
  const { darkMode, setDarkMode, authUser, logout: logoutUser } = useAppStore();


  const {
    level,
    setLevel,
    freeImportsUsed,
    resetAll,
    creditsBalance,
    addCredits,
    reminder,
    setReminderLocal,
    refreshReminder,

    themeMode,
    setThemeMode,
  } = useAppStore() as any as {
    level: string;
    setLevel: (l: any) => void;
    freeImportsUsed: number;
    resetAll: () => void;
    creditsBalance: number;
    addCredits: (n: number) => void;
    reminder: { enabled: boolean; hour: number; minute: number; notifId: string | null };
    setReminderLocal: (v: { hour: number; minute: number }) => void;
    refreshReminder: () => Promise<void>;
    themeMode: ThemeMode;
    setThemeMode: (m: ThemeMode) => Promise<void> | void;
  };

  function onReset() {
    Alert.alert("Reset", "Supprimer decks + reviews (MVP) ?", [
      { text: "Annuler", style: "cancel" },
      { text: "OK", style: "destructive", onPress: () => resetAll() },
    ]);
  }

  async function toggleReminder(next: boolean) {
    if (!next) {
      await cancelScheduled(reminder.notifId);
      await repo.setReminderSettings({ ...reminder, enabled: false, notifId: null });
      await refreshReminder();
      return;
    }

    const ok = await requestNotificationPermission();
    if (!ok) {
      Alert.alert("Permission refusée", "Active les notifications dans les réglages iOS/Android.");
      return;
    }

    await cancelScheduled(reminder.notifId);

    const id = await scheduleDailyReminder({
      hour: reminder.hour,
      minute: reminder.minute,
      title: "Révision CliniCard",
      body: "10 minutes aujourd’hui et tu progresses 🔥",
    });

    await repo.setReminderSettings({ ...reminder, enabled: true, notifId: id });
    await refreshReminder();
  }

  async function applyHour() {
    if (!reminder.enabled) {
      await repo.setReminderSettings({ ...reminder, notifId: null });
      await refreshReminder();
      return;
    }

    const ok = await requestNotificationPermission();
    if (!ok) {
      Alert.alert("Permission refusée", "Active les notifications dans les réglages iOS/Android.");
      return;
    }

    await cancelScheduled(reminder.notifId);

    const id = await scheduleDailyReminder({
      hour: reminder.hour,
      minute: reminder.minute,
      title: "Révision CliniCard",
      body: "10 minutes aujourd’hui et tu progresses 🔥",
    });

    await repo.setReminderSettings({ ...reminder, enabled: true, notifId: id });
    await refreshReminder();
  }

  const reminderLabel = `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`;

  async function handleLogout() {
    Alert.alert(
      "Déconnexion",
      "Tu vas te déconnecter. Tes données locales resteront sur cet appareil.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnexion",
          style: "destructive",
          onPress: async () => {
            await logoutUser();
            Alert.alert("Déconnecté", "Tu peux te reconnecter à tout moment.");
          },
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Toutes tes données seront définitivement supprimées :\n\n• Tes decks et flashcards\n• Tes révisions et statistiques\n• Ton compte et tes données cloud\n\nEs-tu sûr de vouloir continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          style: "destructive",
          onPress: async () => {
            try {
              const { success, error } = await authService.deleteAccount();
              
              if (success) {
                // Réinitialiser l'état de l'app
                await logoutUser();
                Alert.alert(
                  "Compte supprimé",
                  "Ton compte et toutes tes données ont été supprimés avec succès.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Rediriger vers l'écran d'accueil
                        router.replace("/(tabs)");
                      },
                    },
                  ]
                );
              } else {
                Alert.alert("Erreur", error || "Impossible de supprimer le compte. Réessaie plus tard.");
              }
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Une erreur est survenue lors de la suppression.");
            }
          },
        },
      ]
    );
  }

  async function openPrivacyPolicy() {
    const url = "https://romaind-prog.github.io/clinicard/privacy-policy.html";
    try {
      // Vérifier si l'URL peut être ouverte
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        // Ouvrir l'URL dans le navigateur
        await Linking.openURL(url);
      } else {
        // Si l'URL n'est pas supportée, essayer quand même (certaines plateformes retournent false même si ça marche)
        try {
          await Linking.openURL(url);
        } catch (openError: any) {
          Alert.alert(
            "URL inaccessible",
            `Impossible d'ouvrir la page de confidentialité.\n\nURL : ${url}\n\nVérifie ta connexion internet ou réessaie plus tard.`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error: any) {
      console.error("Erreur ouverture Privacy Policy:", error);
      Alert.alert(
        "Erreur",
        `Impossible d'ouvrir la page de confidentialité.\n\nErreur : ${error?.message || "Inconnue"}\n\nURL : ${url}`,
        [{ text: "OK" }]
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <TopBar   title="Réglages"
  showBack={false} // ✅
  rightIcon="settings-outline" // si tu veux, sinon retire
  onPressRight={() => {}}
  variant="large"/>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 120 }}>
        {/* COMPTE */}
        {CLOUD_SYNC_ENABLED && (
          <>
            <SectionTitle>COMPTE</SectionTitle>
            <Group>
              {authUser ? (
                <>
                  <Row
                    icon="person-circle-outline"
                    title={authUser.email}
                    subtitle="Connecté • Sync automatique activée"
                    right={<Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                  />
                  <Divider />
                  <Row
                    icon="log-out-outline"
                    title="Déconnexion"
                    subtitle="Reste en mode local"
                    onPress={handleLogout}
                    danger
                    right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
                  />
                  <Divider />
                  <Row
                    icon="trash-outline"
                    title="Supprimer mon compte"
                    subtitle="RGPD • Action irréversible"
                    onPress={handleDeleteAccount}
                    danger
                    right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
                  />
                </>
              ) : (
                <>
                  <Row
                    icon="cloud-offline-outline"
                    title="Mode local uniquement"
                    subtitle="Connecte-toi pour sauvegarder dans le cloud"
                  />
                  <Divider />
                  <Row
                    icon="log-in-outline"
                    title="Se connecter"
                    subtitle="Accède à tes cours partout"
                    onPress={() => router.push("/auth/login")}
                    right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
                  />
                  <Divider />
                  <Row
                    icon="person-add-outline"
                    title="Créer un compte"
                    subtitle="Sauvegarde tes données dans le cloud"
                    onPress={() => router.push("/auth/signup")}
                    right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
                  />
                </>
              )}
            </Group>
          </>
        )}

        {/* CONFIG */}
        <SectionTitle>CONFIG MVP</SectionTitle>
        <Group>
          <Row
            icon="flask-outline"
            title="Mock API"
            subtitle="Mode test / prod"
            right={<RightValue>{String(MOCK_API)}</RightValue>}
          />
          <Divider />

          <Row
            icon="school-outline"
            title="Niveau"
            subtitle="PASS / EDN_ECOS"
            right={<RightValue>{level}</RightValue>}
          />
          <Divider />

          <Row
            icon="cloud-upload-outline"
            title="Imports utilisés"
            subtitle={`${freeImportsUsed} / ${FREE_IMPORTS_LIMIT}`}
            right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
          />
          <Divider />

          <Row
            icon="flash-outline"
            title="Crédits"
            subtitle="Solde actuel"
            right={<RightValue>{creditsBalance}</RightValue>}
          />
        </Group>

        {/* APPARENCE */}
        <SectionTitle>APPARENCE</SectionTitle>
        <Group>
        <Row
              icon="moon-outline"
              title="Mode nuit"
              subtitle={darkMode ? "Activé" : "Auto (système)"}
              right={
                <Switch
                  value={darkMode}
                  onValueChange={(v) => setDarkMode(v)}
                  trackColor={{ false: t.dark ? "#283039" : "#E5E7EB", true: t.primary }}
                  thumbColor={"#fff"}
                />
              }
            />
            
        </Group>

        {/* STUDY */}
        <SectionTitle>STUDY PREFERENCES</SectionTitle>
        <Group>
          <Row
            icon="notifications-outline"
            title="Review Reminders"
            subtitle={reminder.enabled ? `Actif • ${reminderLabel}` : "Inactif"}
            right={
              <Switch
                value={reminder.enabled}
                onValueChange={(v) => toggleReminder(v)}
                trackColor={{ false: t.dark ? "#283039" : "#E5E7EB", true: t.primary }}
                thumbColor={"#fff"}
              />
          }
          />


          <Divider />

          <View style={{ padding: 12 }}>
            <Text style={{ color: t.muted, fontFamily: t.font.body, marginBottom: 10, fontSize: 12 }}>
              Choisir une heure (MVP)
            </Text>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <ModePill label="19:00" active={reminder.hour === 19} onPress={() => setReminderLocal({ hour: 19, minute: 0 })} />
              <ModePill label="20:00" active={reminder.hour === 20} onPress={() => setReminderLocal({ hour: 20, minute: 0 })} />
              <ModePill label="21:00" active={reminder.hour === 21} onPress={() => setReminderLocal({ hour: 21, minute: 0 })} />
            </View>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={applyHour}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: t.primary, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <Text style={{ color: "#fff", fontFamily: t.font.display, fontSize: 14 }}>
                Appliquer l’heure
              </Text>
            </Pressable>
          </View>
        </Group>

        {/* NIVEAU */}
        <SectionTitle>NIVEAU</SectionTitle>
        <Group>
          <View style={{ flexDirection: "row", gap: 10, padding: 12 }}>
            <Pressable
              onPress={() => setLevel("PASS")}
              style={({ pressed }) => [
                styles.levelBtn,
                {
                  backgroundColor: level === "PASS" ? t.primary : (t.dark ? "#283039" : "#EEF2FF"),
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ color: level === "PASS" ? "#fff" : t.text, fontFamily: t.font.display }}>PASS</Text>
            </Pressable>

            <Pressable
              onPress={() => setLevel("EDN_ECOS")}
              style={({ pressed }) => [
                styles.levelBtn,
                {
                  backgroundColor: level === "EDN_ECOS" ? t.primary : (t.dark ? "#283039" : "#EEF2FF"),
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={{ color: level === "EDN_ECOS" ? "#fff" : t.text, fontFamily: t.font.display }}>
                EDN_ECOS
              </Text>
            </Pressable>
          </View>
        </Group>

        {/* PAYWALL TEST */}
        <SectionTitle>PAYWALL (TEST)</SectionTitle>
        <Group>
          <Row
            icon="add-circle-outline"
            title="(Test) +10 crédits"
            subtitle="Debug uniquement"
            onPress={() => addCredits(10)}
            right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
          />
        </Group>

        {/* DEBUG */}
        <SectionTitle>DEBUG</SectionTitle>
        <Group>
          <Row
            icon="trash-outline"
            title="Reset local (decks + révisions)"
            subtitle="Supprime les données locales"
            onPress={onReset}
            danger
            right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
          />
          <Divider />
          <Row
            icon="refresh-outline"
            title="Rejouer onboarding"
            subtitle="Relance l’app ensuite"
            onPress={async () => {
              await repo.setOnboardingDone(false);
              Alert.alert("OK", "Relance l'app (ou reload) pour revoir l'onboarding.");
            }}
            right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
          />
        </Group>

        {/* LÉGAL */}
        <SectionTitle>LÉGAL</SectionTitle>
        <Group>
          <Row
            icon="shield-checkmark-outline"
            title="Politique de confidentialité"
            subtitle="Privacy Policy"
            onPress={openPrivacyPolicy}
            right={<Ionicons name="open-outline" size={18} color={t.muted} />}
          />
        </Group>

        <Text style={{ marginTop: 18, textAlign: "center", color: t.muted, fontFamily: t.font.body, fontSize: 12 }}>
          CliniCard • MVP
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 10,
    fontSize: 12,
    letterSpacing: 1.2, // ✅ plus “tracking” comme le HTML
  },

  group: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginHorizontal: 6, // ✅ comme “mx-2”
  },

  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  right: {
    marginLeft: 12,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  iconBox: {
    width: 40, // ✅ comme le HTML size-10
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 14 + 40 + 12, // ✅ démarre après l’icône (comme ton sep)
  },

  modePill: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryBtn: {
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  levelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
