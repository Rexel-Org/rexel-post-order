import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/useI18n";
import type { MarketCode } from "@/i18n/messages";
import { useMarketLocaleStore } from "@/stores/marketLocaleStore";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useVersionStore, type AppView } from "@/stores/versionStore";

const MARKETS: MarketCode[] = ["FR", "SE", "DE", "EN"];

export default function ScenarioSwitcher() {
  const { t } = useI18n();
  const market = useMarketLocaleStore((s) => s.market);
  const setMarket = useMarketLocaleStore((s) => s.setMarket);
  const view = useVersionStore((s) => s.view);
  const setView = useVersionStore((s) => s.setView);
  const location = useLocation();
  const navigate = useNavigate();

  const triggerClass =
    "h-8 w-[min(240px,70vw)] border-[var(--color-border-subtle)] bg-[var(--color-white)] text-[12px] text-[var(--color-text-primary)] shadow-none";

  // Sync view with current route (v1 vs v2 only matters for order history)
  useEffect(() => {
    const isV2 = location.pathname.startsWith("/v2");
    if (view === "homepage") return;
    const inferred: AppView = isV2 ? "order_history_v2" : "order_history_v1";
    if (inferred !== view) setView(inferred);
  }, [location.pathname, setView, view]);

  const handleViewChange = (v: AppView) => {
    setView(v);
    navigate(v === "order_history_v2" ? "/v2" : "/");
  };

  return (
    <div className="flex flex-col items-start gap-2 font-[var(--font-body)] text-[12px] text-[var(--color-text-secondary)] sm:flex-row sm:items-center">
      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap">{t("proto.market")}</span>
        <Select value={market} onValueChange={(v) => setMarket(v as MarketCode)}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MARKETS.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`market.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap">{t("proto.scenario")}</span>
        <Select value={view} onValueChange={(v) => handleViewChange(v as AppView)}>
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="homepage">{t("scenario.homepage")}</SelectItem>
            <SelectItem value="order_history_v1">{t("scenario.order_history")} V1</SelectItem>
            <SelectItem value="order_history_v2">{t("scenario.order_history")} V2</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
