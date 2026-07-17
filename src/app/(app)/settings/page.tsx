import { SettingsForm } from "@/components/settings/settings-form";
import { requireUser } from "@/lib/auth";
import { getOrCreateSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getOrCreateSettings(user.id, user.timezone);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Лимиты, FSRS, режим проверки и внешний вид.</p>
      </div>
      <SettingsForm
        settings={{
          newCardsPerDay: settings.newCardsPerDay,
          maxReviewsPerDay: settings.maxReviewsPerDay,
          desiredRetention: settings.desiredRetention,
          reviewMode: settings.reviewMode,
          theme: settings.theme,
          timezone: settings.timezone,
          interfaceLanguage: settings.interfaceLanguage,
          pronunciationEnabled: settings.pronunciationEnabled,
          newCardOrder: settings.newCardOrder
        }}
      />
    </div>
  );
}
