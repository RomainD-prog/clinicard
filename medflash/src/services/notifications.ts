import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;

  const ask = await Notifications.requestPermissionsAsync();
  return ask.granted;
}

export async function scheduleDailyReminder(params: {
  hour: number;
  minute: number;
  title?: string;
  body?: string;
}): Promise<string> {
  await ensureAndroidChannel();

  const hour = Math.max(0, Math.min(23, Math.floor(params.hour)));
  const minute = Math.max(0, Math.min(59, Math.floor(params.minute)));

  const trigger: Notifications.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
    ...(Platform.OS === "android" ? { channelId: "default" as const } : null),
  };

  return Notifications.scheduleNotificationAsync({
    content: {
      title: params.title ?? "Révision CliniCard",
      body: params.body ?? "10 minutes aujourd'hui et tu progresses 🔥",
      sound: false,
    },
    trigger,
  });
}

export async function cancelScheduled(id: string | null | undefined) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}
