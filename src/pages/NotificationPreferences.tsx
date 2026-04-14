import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Mail, Smartphone, CalendarClock,
  CheckCircle, Truck, Package, AlertTriangle, FileText, RotateCcw,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";

const eventIcons: Record<string, typeof CheckCircle> = {
  order_confirmed: CheckCircle,
  being_prepared: Package,
  in_transit: Truck,
  delivered: CheckCircle,
  partially_delivered: Package,
  delayed: AlertTriangle,
  date_changed: CalendarClock,
  backorder_update: RotateCcw,
  invoice_available: FileText,
};

type ChannelKey = "email" | "push" | "daily_digest";

interface NotifPref {
  id: string;
  event_type: string;
  email: boolean;
  push: boolean;
  daily_digest: boolean;
}

function useNotificationPreferences() {
  return useQuery({
    queryKey: ["notification_preferences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_preferences").select("*").order("event_type");
      if (error) throw error;
      return data as NotifPref[];
    },
  });
}

export default function NotificationPreferences() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useNotificationPreferences();

  const channels = useMemo(
    () =>
      [
        { key: "email" as const, label: t("notif.email"), icon: Mail },
        { key: "push" as const, label: t("notif.push"), icon: Smartphone },
        { key: "daily_digest" as const, label: t("notif.digest"), icon: CalendarClock },
      ] as const,
    [t]
  );

  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: ChannelKey; value: boolean }) => {
      const update: Pick<NotifPref, "email" | "push" | "daily_digest"> = { email: false, push: false, daily_digest: false, [field]: value };
      const { error } = await supabase
        .from("notification_preferences")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: ["notification_preferences"] });
      const prev = queryClient.getQueryData<NotifPref[]>(["notification_preferences"]);
      queryClient.setQueryData<NotifPref[]>(["notification_preferences"], (old) =>
        old?.map((p) => (p.id === id ? { ...p, [field]: value } : p))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["notification_preferences"], ctx.prev);
      toast.error(t("notif.updateError"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notification_preferences"] });
    },
  });

  const toggleAll = (field: ChannelKey, value: boolean) => {
    prefs?.forEach((p) => {
      if (p[field] !== value) {
        updateMutation.mutate({ id: p.id, field, value });
      }
    });
  };

  const allChecked = (field: ChannelKey) => prefs?.every((p) => p[field]) ?? false;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="headline-xl font-[var(--font-heading)] text-[var(--color-text-primary)]">{t("notif.title")}</h1>
        <p className="mt-1 font-[var(--font-body)] text-[12px] leading-[16px] text-[var(--color-text-secondary)]">
          {t("notif.subtitle")}
        </p>
      </div>

      <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] overflow-hidden shadow-[var(--shadow-1)]">
        <div className="grid grid-cols-[1fr_80px_80px_100px] items-center border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-01)] px-5 py-3">
          <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{t("notif.event")}</span>
          {channels.map((ch) => (
            <div key={ch.key} className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">{ch.label}</span>
              <Switch
                checked={allChecked(ch.key)}
                onCheckedChange={(v) => toggleAll(ch.key, v)}
                className="scale-75"
              />
            </div>
          ))}
        </div>

        <div className="divide-y divide-[var(--color-border-subtle)]">
          {prefs?.map((pref) => {
            const Icon = eventIcons[pref.event_type];
            if (!Icon) return null;
            return (
              <div
                key={pref.id}
                className="grid grid-cols-[1fr_80px_80px_100px] items-center px-5 py-3.5 hover:bg-[var(--color-bg-layer-01)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-layer-01)] text-[var(--color-text-secondary)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{t(`notif.${pref.event_type}`)}</p>
                    <p className="text-xs text-[var(--color-text-helper)] truncate">{t(`notif.${pref.event_type}.desc`)}</p>
                  </div>
                </div>
                {channels.map((ch) => (
                  <div key={ch.key} className="flex justify-center">
                    <Switch
                      checked={pref[ch.key]}
                      onCheckedChange={(v) => updateMutation.mutate({ id: pref.id, field: ch.key, value: v })}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-helper)]">{t("notif.footer")}</p>
    </div>
  );
}
