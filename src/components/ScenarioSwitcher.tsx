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
import { useVersionStore, type AppVersion, type AppScenario } from "@/stores/versionStore";

const MARKETS: MarketCode[] = ["FR", "SE", "DE", "EN"];

export default function ScenarioSwitcher() {
  const { t } = useI18n();
  const market = useMarketLocaleStore((s) => s.market);
  const setMarket = useMarketLocaleStore((s) => s.setMarket);
  const version = useVersionStore((s) => s.version);
  const setVersion = useVersionStore((s) => s.setVersion);
  const scenario = useVersionStore((s) => s.scenario);
  const setScenario = useVersionStore((s) => s.setScenario);
  const location = useLocation();
  const navigate = useNavigate();

  const triggerClass =
    "h-8 w-[min(200px,70vw)] border-[var(--color-border-subtle)] bg-[var(--color-white)] text-[12px] text-[var(--color-text-primary)] shadow-none";

  useEffect(() => {
    const isV2 = location.pathname.startsWith("/v2");
    const inferred: AppVersion = isV2 ? "v2" : "v1";
    if (inferred !== version) setVersion(inferred);
  }, [location.pathname, setVersion, version]);

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
        <span className="whitespace-nowrap">{t("proto.version")}</span>
        <Select
          value={version}
          onValueChange={(v) => {
            const next = v as AppVersion;
            setVersion(next);
            navigate(next === "v2" ? "/v2" : "/");
          }}
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="v1">V1</SelectItem>
            <SelectItem value="v2">V2</SelectItem>
          </SelectContent>
        </Select>
      </label>

      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap">{t("proto.scenario")}</span>
        <Select
          value={scenario}
          onValueChange={(v) => {
            const next = v as AppScenario;
            setScenario(next);
            navigate("/");
          }}
        >
          <SelectTrigger className={triggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order_history">{t("scenario.order_history")}</SelectItem>
            <SelectItem value="homepage">{t("scenario.homepage")}</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
