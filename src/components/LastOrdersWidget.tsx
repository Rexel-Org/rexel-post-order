import { useState, useMemo } from "react";
import { ChevronRight, Package, Truck, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOrders } from "@/hooks/useOrders";
import { useI18n } from "@/i18n/useI18n";
import { useVersionStore } from "@/stores/versionStore";
import OrderSidePanel from "@/components/OrderSidePanel";
import { cn } from "@/lib/utils";

const statusVisual: Record<string, { icon: typeof CheckCircle; colorClass: string; bgClass: string }> = {
  being_prepared: { icon: Package, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  in_transit: { icon: Truck, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  partially_delivered: {
    icon: Package,
    colorClass: "text-[var(--color-alert-warning-text)]",
    bgClass: "bg-[var(--color-alert-warning-bg)] border-[var(--color-alert-warning-border)]",
  },
  delayed: {
    icon: AlertTriangle,
    colorClass: "text-[var(--color-alert-error-text)]",
    bgClass: "bg-[var(--color-alert-error-bg)] border-[var(--color-alert-error-border)]",
  },
  cancelled: { icon: XCircle, colorClass: "text-[var(--color-error)]", bgClass: "bg-[var(--color-alert-error-bg)] border-[var(--color-error)]" },
  completed: { icon: CheckCircle, colorClass: "text-[var(--color-success)]", bgClass: "bg-[var(--color-alert-success-bg)] border-[var(--color-success)]" },
};

function StatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  const meta = statusVisual[status] ?? statusVisual.in_transit;
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] font-semibold", meta.bgClass, meta.colorClass)}>
      <Icon className="h-3 w-3 shrink-0" />
      {t(`orderStatus.${status}`)}
    </span>
  );
}

export default function LastOrdersWidget() {
  const { t, formatDate, formatCurrency } = useI18n();
  const { data: orders } = useOrders();
  const navigate = useNavigate();
  const setScenario = useVersionStore((s) => s.setScenario);
  const [openOrder, setOpenOrder] = useState<string | null>(null);

  const recent = useMemo(() => (orders ?? []).slice(0, 4), [orders]);

  const goToHistory = () => {
    setScenario("order_history");
    navigate("/");
  };

  return (
    <>
      <section className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)]">
        <header className="flex items-center justify-between gap-3 pb-[var(--spacing-2)]">
          <h2 className="font-[var(--font-heading)] text-[18px] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
            {t("widget.lastOrders.title")}
          </h2>
          <button
            type="button"
            onClick={goToHistory}
            className="inline-flex items-center gap-1 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)] hover:underline"
          >
            {t("widget.lastOrders.viewAll")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </header>

        {recent.length === 0 ? (
          <p className="py-[var(--spacing-4)] text-center text-[14px] text-[var(--color-text-secondary)]">
            {t("widget.lastOrders.empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-[6px] border border-[var(--color-border-subtle)]">
            <table className="w-full border-collapse text-[14px]">
              <thead className="bg-[var(--color-bg-layer-01)] text-[12px] uppercase tracking-wide text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-3 py-2 text-left font-[var(--font-weight-semibold)]">{t("orders.colDate")}</th>
                  <th className="px-3 py-2 text-left font-[var(--font-weight-semibold)]">{t("orders.colOrder")}</th>
                  <th className="px-3 py-2 text-left font-[var(--font-weight-semibold)]">{t("orders.colPO")}</th>
                  <th className="px-3 py-2 text-left font-[var(--font-weight-semibold)]">{t("orders.colStatus")}</th>
                  <th className="px-3 py-2 text-right font-[var(--font-weight-semibold)]">{t("orders.colTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setOpenOrder(o.order_number)}
                    className="cursor-pointer border-t border-[var(--color-border-subtle)] transition-colors hover:bg-[var(--color-bg-layer-01)]"
                  >
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{formatDate(o.order_date, "dd/MM/yyyy")}</td>
                    <td className="px-3 py-2 font-[var(--font-weight-semibold)] text-[var(--color-primary)]">{o.order_number}</td>
                    <td className="px-3 py-2 text-[var(--color-text-secondary)]">{o.po_number ?? "—"}</td>
                    <td className="px-3 py-2"><StatusPill status={o.status} /></td>
                    <td className="px-3 py-2 text-right font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
                      {formatCurrency(Number(o.total_amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <OrderSidePanel orderNumber={openOrder} onClose={() => setOpenOrder(null)} />
    </>
  );
}
