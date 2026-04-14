import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck, Package, CheckCircle, Clock,
  ChevronLeft, ChevronRight, CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrders, useShipments, useLineItems, type OrderRow, type ShipmentRow, type LineItemRow } from "@/hooks/useOrders";
import { format, startOfDay, addDays, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useI18n } from "@/i18n/useI18n";

const shipmentStatusVisual: Record<string, { icon: typeof Truck; colorClass: string; bgClass: string }> = {
  confirmed: { icon: Package, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  being_prepared: { icon: Package, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  in_transit: { icon: Truck, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  delivered: { icon: CheckCircle, colorClass: "text-[var(--color-success)]", bgClass: "bg-[var(--color-alert-success-bg)] border-[var(--color-success)]" },
};

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Truck; color: string }) {
  return (
    <div className="rounded-[var(--border-radius-sm)] border border-[#E0E4EB] bg-white p-[var(--spacing-3)]">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-[var(--font-heading)] text-[20px] leading-[28px] font-bold text-[#161616]">{value}</p>
          <p className="font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252]">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ShipmentCard({
  shipment, order, lineItems,
}: {
  shipment: ShipmentRow; order: OrderRow; lineItems: LineItemRow[];
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const meta = shipmentStatusVisual[shipment.status] ?? shipmentStatusVisual.confirmed;
  const Icon = meta.icon;
  const statusLabel = t(`shipStatus.${shipment.status}`);
  const items = lineItems.filter((li) => li.shipment_id === shipment.id);

  return (
    <div
      onClick={() => navigate(`/orders/${order.order_number}`)}
      className="cursor-pointer rounded-[var(--border-radius-sm)] border border-[#E0E4EB] bg-white p-[var(--spacing-3)] hover:shadow-[var(--shadow-2)] transition-all"
    >
      <div className="flex items-start justify-between mb-[var(--spacing-2)]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-[var(--font-body)] text-[14px] leading-[20px] font-[var(--font-weight-semibold)] text-[#161616]">{order.order_number}</span>
            <span className="font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252]">
              · {t("delivery.shipmentN")} {shipment.shipment_index}
            </span>
          </div>
          <p className="font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252]">
            {shipment.carrier && <span>{shipment.carrier} · </span>}
            {order.project_name && <span>{order.project_name}</span>}
          </p>
        </div>
        <span className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 font-[var(--font-body)] text-[12px] leading-[16px] font-[var(--font-weight-semibold)]", meta.bgClass, meta.colorClass)}>
          <Icon className="h-3 w-3 shrink-0" />
          {statusLabel}
        </span>
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5 mb-[var(--spacing-2)]">
          {items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between font-[var(--font-body)] text-[14px] leading-[20px]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-[4px] bg-[#F6F8FB] flex items-center justify-center font-[var(--font-body)] text-[10px] font-bold text-[#525252]">
                  {item.supplier.slice(0, 2).toUpperCase()}
                </div>
                <span className="truncate text-[#161616]">{item.product_name}</span>
              </div>
              <span className="font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252] shrink-0 ml-2">×{item.quantity}</span>
            </div>
          ))}
          {items.length > 3 && (
            <p className="font-[var(--font-body)] text-[12px] leading-[16px] text-[#a8a8a8]">
              +{items.length - 3} {t("delivery.moreItems")}
            </p>
          )}
        </div>
      )}

      {shipment.delivered_at && shipment.delivered_signed_by && (
        <p className="font-[var(--font-body)] text-[12px] leading-[16px] text-[var(--color-success)]">
          ✓ {t("delivery.signedBy")} {shipment.delivered_signed_by}
        </p>
      )}
    </div>
  );
}

export default function DeliveryToday() {
  const { t, formatDateLong, df } = useI18n();
  const { data: orders, isLoading: loadingOrders } = useOrders();
  const { data: shipments, isLoading: loadingShipments } = useShipments();
  const { data: lineItems, isLoading: loadingItems } = useLineItems();

  const demoDate = useMemo(() => {
    if (!shipments?.length) return new Date();
    const today = startOfDay(new Date());
    const todayShipments = shipments.filter((s) => s.expected_delivery && startOfDay(new Date(s.expected_delivery)).getTime() === today.getTime());
    if (todayShipments.length > 0) return today;
    const sorted = shipments
      .filter((s) => s.expected_delivery)
      .map((s) => startOfDay(new Date(s.expected_delivery!)))
      .sort((a, b) => Math.abs(a.getTime() - today.getTime()) - Math.abs(b.getTime() - today.getTime()));
    return sorted[0] ?? today;
  }, [shipments]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const activeDate = selectedDate ?? demoDate;

  const isLoading = loadingOrders || loadingShipments || loadingItems;

  const todayShipments = useMemo(() => {
    if (!shipments) return [];
    const target = startOfDay(activeDate).getTime();
    return shipments.filter((s) => s.expected_delivery && startOfDay(new Date(s.expected_delivery)).getTime() === target);
  }, [shipments, activeDate]);

  const groupedByCarrier = useMemo(() => {
    const groups: Record<string, ShipmentRow[]> = {};
    todayShipments.forEach((s) => {
      const key = s.carrier ?? "Unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [todayShipments]);

  const kpis = useMemo(() => {
    const total = todayShipments.length;
    const delivered = todayShipments.filter((s) => s.status === "delivered").length;
    const inTransit = todayShipments.filter((s) => s.status === "in_transit").length;
    const totalItems = lineItems?.filter((li) => todayShipments.some((s) => s.id === li.shipment_id)).reduce((sum, li) => sum + li.quantity, 0) ?? 0;
    return { total, delivered, inTransit, totalItems };
  }, [todayShipments, lineItems]);

  const orderMap = useMemo(() => {
    const map: Record<string, OrderRow> = {};
    orders?.forEach((o) => { map[o.id] = o; });
    return map;
  }, [orders]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="headline-xl font-[var(--font-heading)] text-[var(--color-text-primary)]">{t("delivery.title")}</h1>
          <p className="mt-1 font-[var(--font-body)] text-[12px] leading-[16px] text-[var(--color-text-secondary)]">
            {t("delivery.subtitle")} {formatDateLong(activeDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedDate(subDays(activeDate, 1))}
            className="h-9 w-9 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 h-9 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-layer-01)]"
              >
                <CalendarIcon className="h-4 w-4" />
                {format(activeDate, "dd/MM/yyyy", { locale: df })}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={activeDate} onSelect={(d) => d && setSelectedDate(d)} />
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(activeDate, 1))}
            className="h-9 w-9 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(undefined)}
            className="px-3 h-9 rounded-[var(--border-radius-sm)] text-sm font-medium text-[var(--color-text-link)] hover:bg-[var(--color-bg-layer-01)]"
          >
            {t("delivery.reset")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={t("delivery.kpiTotal")} value={kpis.total} icon={Package} color="bg-[var(--color-alert-info-bg)] text-[var(--color-info)]" />
        <KpiCard label={t("delivery.kpiDelivered")} value={kpis.delivered} icon={CheckCircle} color="bg-[var(--color-alert-success-bg)] text-[var(--color-success)]" />
        <KpiCard label={t("delivery.kpiTransit")} value={kpis.inTransit} icon={Truck} color="bg-[var(--color-alert-error-bg)] text-[var(--color-warning)]" />
        <KpiCard label={t("delivery.kpiItems")} value={kpis.totalItems} icon={Clock} color="bg-[var(--color-bg-layer-01)] text-[var(--color-text-secondary)]" />
      </div>

      {kpis.total > 0 && (
        <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{t("delivery.receptionProgress")}</span>
            <span className="text-sm text-[var(--color-text-secondary)]">
              {kpis.delivered}/{kpis.total} {t("delivery.receivedOf")}
            </span>
          </div>
          <Progress value={kpis.total > 0 ? Math.round((kpis.delivered / kpis.total) * 100) : 0} className="h-2.5" />
        </div>
      )}

      {todayShipments.length === 0 ? (
        <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] p-12 text-center">
          <Truck className="h-10 w-10 text-[var(--color-text-placeholder)] mx-auto mb-3" />
          <p className="text-[var(--color-text-secondary)] font-medium">{t("delivery.emptyTitle")}</p>
          <p className="text-xs text-[var(--color-text-helper)] mt-1">{t("delivery.emptyHint")}</p>
        </div>
      ) : (
        Object.entries(groupedByCarrier).map(([carrier, carrierShipments]) => (
          <div key={carrier}>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <h2 className="headline-l text-[#161616]">
                {carrier} ({carrierShipments.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {carrierShipments.map((s) => {
                const order = orderMap[s.order_id];
                if (!order) return null;
                return (
                  <ShipmentCard
                    key={s.id}
                    shipment={s}
                    order={order}
                    lineItems={lineItems ?? []}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
