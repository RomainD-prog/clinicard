import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
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

import { CLOUD_SYNC_ENABLED } from "../src/config/supabase";
import * as authService from "../src/services/authService";
import {
  cancelScheduled,
  requestNotificationPermission,
  scheduleDailyReminder,
} from "../src/services/notifications";
import * as repo from "../src/storage/repo";
import { useAppStore } from "../src/store/useAppStore";
import { StudyLevel } from "../src/types/models";
import { useStitchTheme } from "../src/uiStitch/theme";

function SectionTitle({ children }: { children: string }) {
  const t = useStitchTheme();
  return (
    <Text style={[styles.sectionTitle, { color: t.muted, fontFamily: t.font.semibold }]}>
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

function RowContent({
  icon,
  title,
  subtitle,
  right,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const t = useStitchTheme();
  return (
    <>
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: t.dark ? "#283039" : "#EEF2FF" }]}>
          <Ionicons name={icon} size={18} color={danger ? "#ef4444" : t.text} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: danger ? "#ef4444" : t.text,
              fontFamily: t.font.body,
              fontSize: 16,
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
    </>
  );
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
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.9 : 1 }]}
      >
        <RowContent icon={icon} title={title} subtitle={subtitle} right={right} danger={danger} />
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <RowContent icon={icon} title={title} subtitle={subtitle} right={right} danger={danger} />
    </View>
  );
}

function Chip({
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
        styles.chip,
        {
          backgroundColor: active ? t.primary : t.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          borderColor: active ? "rgba(255,255,255,0.25)" : t.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? "#fff" : t.text, fontFamily: t.font.display, fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ProfileSettingsScreen() {
  const t = useStitchTheme();
  const router = useRouter();

  const {
    authUser,
    logout,
    level,
    setLevel,
    darkMode,
    setDarkMode,
    themeMode,
    setThemeMode,
    reminder,
    refreshReminder,
    setReminderLocal,
    reviewStats,
  } = useAppStore() as any;

  const reminderLabel = useMemo(
    () => `${String(reminder.hour).padStart(2, "0")}:${String(reminder.minute).padStart(2, "0")}`,
    [reminder.hour, reminder.minute]
  );

  const studyLevels: StudyLevel[] = ["PASS", "DFGSM", "EDN_ECOS", "AUTRE"];

  async function openPrivacyPolicy() {
    // Ton URL GitHub Pages
    const url = "https://romaind-prog.github.io/clinicard/privacy-policy.html";
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'ouvrir la page.");
    }
  }

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
            await logout();
            Alert.alert("Déconnecté", "Tu peux te reconnecter à tout moment.");
            router.replace("/(tabs)");
          },
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Toutes tes données seront définitivement supprimées (compte + données cloud).",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer définitivement",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await authService.deleteAccount();
              if (error) {
                Alert.alert("Erreur", error);
                return;
              }
              await logout();
              Alert.alert("Compte supprimé", "Ton compte a été supprimé.", [
                { text: "OK", onPress: () => router.replace("/(tabs)") },
              ]);
            } catch (e: any) {
              Alert.alert("Erreur", e?.message ?? "Impossible de supprimer le compte.");
            }
          },
        },
      ]
    );
  }

  async function toggleReminder(next: boolean) {
    try {
      if (!next) {
        await cancelScheduled(reminder.notifId);
        const updated = { ...reminder, enabled: false, notifId: null };
        await repo.setReminderSettings(updated);
        setReminderLocal(updated);
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
        title: "Révision MedFlash",
        body: "10 minutes aujourd’hui et tu progresses.",
      });

      const updated = { ...reminder, enabled: true, notifId: id };
      await repo.setReminderSettings(updated);
      setReminderLocal(updated);
      await refreshReminder();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de modifier le rappel.");
    }
  }

  async function bumpReminderMinutes(delta: number) {
    try {
      const total = (reminder.hour * 60 + reminder.minute + delta + 24 * 60) % (24 * 60);
      const nextHour = Math.floor(total / 60);
      const nextMinute = total % 60;

      if (!reminder.enabled) {
        const updated = { ...reminder, hour: nextHour, minute: nextMinute, notifId: null };
        await repo.setReminderSettings(updated);
        setReminderLocal(updated);
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
        hour: nextHour,
        minute: nextMinute,
        title: "Révision MedFlash",
        body: "10 minutes aujourd’hui et tu progresses.",
      });

      const updated = { ...reminder, hour: nextHour, minute: nextMinute, enabled: true, notifId: id };
      await repo.setReminderSettings(updated);
      setReminderLocal(updated);
      await refreshReminder();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de modifier l'heure.");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: t.text, fontFamily: t.font.display }]}>
          Paramètres
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerClose, { opacity: pressed ? 0.8 : 1 }]}
          hitSlop={10}
        >
          <Ionicons name="close" size={22} color={t.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 28 }}>
        {CLOUD_SYNC_ENABLED && (
          <>
            <SectionTitle>COMPTE</SectionTitle>
            <Group>
              {authUser ? (
                <>
                  <Row
                    icon="person-circle-outline"
                    title={authUser.email}
                    subtitle="Connecté • Sync activée"
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
                    subtitle="Action irréversible"
                    onPress={handleDeleteAccount}
                    danger
                    right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
                  />
                </>
              ) : (
                <>
                  <Row
                    icon="cloud-offline-outline"
                    title="Mode local"
                    subtitle="Connecte-toi pour activer la sauvegarde"
                  />
                  <Divider />
                  <Row
                    icon="log-in-outline"
                    title="Se connecter"
                    subtitle="Accède à tes données partout"
                    onPress={() => router.push("/auth/login")}
                    right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
                  />
                  <Divider />
                  <Row
                    icon="person-add-outline"
                    title="Créer un compte"
                    subtitle="Sauvegarde dans le cloud"
                    onPress={() => router.push("/auth/signup")}
                    right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
                  />
                </>
              )}
            </Group>
          </>
        )}

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
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          <Row
            icon="color-palette-outline"
            title="Thème"
            subtitle="Système / Clair / Sombre"
            right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
            onPress={() => {
              Alert.alert("Thème", "Choisir un mode", [
                { text: "Système", onPress: () => setThemeMode("system") },
                { text: "Clair", onPress: () => setThemeMode("light") },
                { text: "Sombre", onPress: () => setThemeMode("dark") },
                { text: "Annuler", style: "cancel" },
              ]);
            }}
          />
        </Group>

        <SectionTitle>RÉVISION</SectionTitle>
        <Group>
          <Row
            icon="notifications-outline"
            title="Rappels de révision"
            subtitle={reminder.enabled ? `Actif • ${reminderLabel}` : "Inactif"}
            right={
              <Switch
                value={reminder.enabled}
                onValueChange={(v) => toggleReminder(v)}
                trackColor={{ false: t.dark ? "#283039" : "#E5E7EB", true: t.primary }}
                thumbColor="#fff"
              />
            }
          />
          <Divider />

          <View style={{ padding: 12 }}>
            <Text style={{ color: t.muted, fontFamily: t.font.body, marginBottom: 10, fontSize: 12 }}>
              Heure du rappel
            </Text>

            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Pressable
                onPress={() => bumpReminderMinutes(-15)}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { opacity: pressed ? 0.85 : 1, borderColor: t.border },
                ]}
              >
                <Ionicons name="remove" size={18} color={t.text} />
              </Pressable>

              <View style={[styles.timePill, { backgroundColor: t.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                <Text style={{ color: t.text, fontFamily: t.font.display, fontSize: 14 }}>
                  {reminderLabel}
                </Text>
              </View>

              <Pressable
                onPress={() => bumpReminderMinutes(15)}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { opacity: pressed ? 0.85 : 1, borderColor: t.border },
                ]}
              >
                <Ionicons name="add" size={18} color={t.text} />
              </Pressable>
            </View>
          </View>
        </Group>

        <SectionTitle>NIVEAU</SectionTitle>
        <Group>
          <View style={{ padding: 12, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {studyLevels.map((l) => (
              <Chip key={l} label={l} active={level === l} onPress={() => setLevel(l)} />
            ))}
          </View>
        </Group>

        <SectionTitle>STATISTIQUES</SectionTitle>
        <Group>
          <Row
            icon="flame-outline"
            title="Série"
            subtitle={`${reviewStats?.streak ?? 0} jour(s) consécutif(s)`}
            right={<Ionicons name="chevron-forward" size={18} color={t.muted} />}
            onPress={() => Alert.alert("Série", "La vue détaillée arrive bientôt.")}
          />
        </Group>

        <SectionTitle>INFORMATIONS</SectionTitle>
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
          MedFlash • MVP
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
  },
  headerClose: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 1,
  },
  group: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },

  row: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  right: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  timePill: {
    minWidth: 92,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.02)",
  },
});
