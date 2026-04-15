import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle, Truck, Package, AlertTriangle, XCircle,
  ClipboardCheck, FileText, ShoppingCart, Star,
  Phone, Mail, X, Copy, Check, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { useOrderWithDetails, type ShipmentRow, type LineItemRow } from "@/hooks/useOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/useI18n";
import { isHandoffOrderId } from "@/lib/checkoutHandoff";

function productImageUrl(ref: string) {
  const hash = Array.from(ref).reduce((a, c) => a + c.charCodeAt(0), 0);
  const id = (hash % 200) + 10;
  return `https://picsum.photos/seed/${id}/64/64`;
}

const statusVisual: Record<string, { icon: typeof CheckCircle; colorClass: string; bgClass: string }> = {
  on_track: { icon: CheckCircle, colorClass: "text-[var(--color-success)]", bgClass: "bg-[var(--color-alert-success-bg)] border-[var(--color-success)]" },
  being_prepared: { icon: Package, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  in_transit: { icon: Truck, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  partially_delivered: {
    icon: Package,
    colorClass: "text-[var(--color-alert-error-text)]",
    bgClass: "bg-[var(--color-alert-error-bg)] border-[var(--color-alert-error-border)]",
  },
  delayed: {
    icon: AlertTriangle,
    colorClass: "text-[var(--color-alert-error-text)]",
    bgClass: "bg-[var(--color-alert-error-bg)] border-[var(--color-alert-error-border)]",
  },
  cancelled: { icon: XCircle, colorClass: "text-[var(--color-error)]", bgClass: "bg-[var(--color-alert-error-bg)] border-[var(--color-error)]" },
  completed: { icon: CheckCircle, colorClass: "text-[var(--color-success)]", bgClass: "bg-[var(--color-alert-success-bg)] border-[var(--color-success)]" },
};

const trackingSteps = [
  { key: "confirmed", track: "confirmed" as const, icon: ClipboardCheck },
  { key: "in_transit", track: "in_transit" as const, icon: Truck },
  { key: "delivered", track: "delivered" as const, icon: Package },
];

function stepIndex(status: string) {
  if (status === "delivered") return 2;
  if (status === "in_transit") return 1;
  return 0;
}

function CopyPill({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        toast.success(t("common.copied"));
      }}
      className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-white px-3 text-[12px] font-semibold text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
    >
      {text}
      <Copy className="h-3 w-3 text-[var(--color-primary)]" />
    </button>
  );
}

function ShipmentMini({ shipment, lineItems }: { shipment: ShipmentRow; lineItems: LineItemRow[] }) {
  const { t, formatDate } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const current = stepIndex(shipment.status);
  const items = lineItems.filter((li) => li.shipment_id === shipment.id);
  const LIMIT = 5;
  const visibleItems = showAll ? items : items.slice(0, LIMIT);
  const hiddenCount = items.length - LIMIT;

  return (
    <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          {t("delivery.shipmentN")} {shipment.shipment_index}
        </span>
        <span className="text-[12px] text-[var(--color-text-secondary)]">{shipment.carrier ?? ""}</span>
      </div>

      <div className="relative mb-3 flex w-full items-center justify-between">
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2">
          <div className="flex">
            {[0, 1].map((i) => (
              <div
                key={i}
                className={cn("h-0.5 flex-1", i < current ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-subtle)]")}
              />
            ))}
          </div>
        </div>
        {trackingSteps.map((step, i) => {
          const done = i <= current;
          return (
            <div key={step.key} className="relative z-10 flex flex-1 items-center justify-center">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  done
                    ? "bg-[var(--color-primary)] text-[var(--color-white)]"
                    : "bg-[var(--color-bg-layer-01)] text-[var(--color-text-placeholder)]"
                )}
              >
                <step.icon className="h-4 w-4" />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[12px] text-[var(--color-text-secondary)] mb-3">
        {shipment.status === "delivered"
          ? `${t("side.miniDelivered")} ${formatDate(shipment.delivered_at, "dd/MM/yyyy")}${
              shipment.delivered_signed_by ? ` — ${t("side.miniSigned")} ${shipment.delivered_signed_by}` : ""
            }`
          : `${t("side.miniExpected")} ${formatDate(shipment.expected_delivery, "dd/MM/yyyy")}`}
      </p>

      {items.length > 0 && (
        <div className="space-y-2">
          {visibleItems.map((item) => {
            const delivered = item.quantity - item.remaining;
            const pct = item.quantity > 0 ? Math.round((delivered / item.quantity) * 100) : 0;
            return (
              <div key={item.id} className="flex items-start gap-2 text-[12px]">
                <div className="h-6 w-6 shrink-0 rounded border border-[#E0E4EB] bg-[#F6F8FB] flex items-center justify-center"><Package className="h-3 w-3 text-[#a8a8a8]" /></div>
                <span className="truncate text-[var(--color-text-primary)]">{item.product_name}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <Progress value={pct} className="h-1 w-10" />
                  <span className="text-[var(--color-text-secondary)]">
                    {delivered}/{item.quantity}
                  </span>
                </div>
              </div>
            );
          })}
          {items.length > LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-[12px] font-semibold text-[var(--color-primary)] hover:underline pt-1"
            >
              {showAll ? t("side.showLess") : `${t("side.showMore")} (${hiddenCount})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const MOCK_DOCUMENTS = [
  { name: "Invoice INV-2024-0847", type: "Invoice", date: "2024-12-15", icon: FileText },
  { name: "Invoice INV-2024-0612", type: "Invoice", date: "2024-12-01", icon: FileText },
  { name: "Delivery note BL-2024-1293", type: "Delivery note", date: "2024-12-14", icon: FileText },
  { name: "Delivery note BL-2024-1180", type: "Delivery note", date: "2024-12-10", icon: FileText },
  { name: "Order confirmation", type: "Confirmation", date: "2024-12-10", icon: ClipboardCheck },
  { name: "Pro-forma invoice", type: "Pro-forma", date: "2024-12-09", icon: FileText },
  { name: "Technical datasheet — Câble R2V", type: "Technical", date: "2024-12-08", icon: FileText },
  { name: "Certificate of conformity", type: "Certificate", date: "2024-12-08", icon: ClipboardCheck },
  { name: "Material Safety Data Sheet", type: "Technical", date: "2024-12-07", icon: FileText },
  { name: "Warranty certificate", type: "Certificate", date: "2024-12-05", icon: ClipboardCheck },
];

function groupDocsByType(docs: typeof MOCK_DOCUMENTS) {
  const groups: Record<string, typeof MOCK_DOCUMENTS> = {};
  docs.forEach((doc) => {
    if (!groups[doc.type]) groups[doc.type] = [];
    groups[doc.type].push(doc);
  });
  return groups;
}

interface OrderSidePanelProps {
  orderNumber: string | null;
  onClose: () => void;
}

type TabKey = "detail" | "documents" | "reception";

export default function OrderSidePanel({ orderNumber, onClose }: OrderSidePanelProps) {
  const { t, formatDate, formatCurrency } = useI18n();
  const { data, isLoading, refetch } = useOrderWithDetails(orderNumber ?? undefined);

  const [activeTab, setActiveTab] = useState<TabKey>("detail");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [showAllItems, setShowAllItems] = useState(false);

  const open = !!orderNumber;
  const isCompletedOrder = data?.order.status === "completed";

  useEffect(() => {
    if (data && isCompletedOrder) {
      const all: Record<string, boolean> = {};
      data.lineItems.forEach((li) => {
        all[li.id] = true;
      });
      setCheckedItems(all);
    }
  }, [data, isCompletedOrder]);

  const toggleItem = (id: string) => {
    if (isCompletedOrder) return;
    setCheckedItems((p) => ({ ...p, [id]: !p[id] }));
  };
  const checkedCount = data ? Object.values(checkedItems).filter(Boolean).length : 0;
  const allChecked = data ? data.lineItems.length > 0 && checkedCount === data.lineItems.length : false;

  const checkAll = () => {
    if (!data || isCompletedOrder) return;
    const all: Record<string, boolean> = {};
    data.lineItems.forEach((li) => {
      all[li.id] = true;
    });
    setCheckedItems(all);
  };

  const handleValidateReception = async () => {
    if (!data) return;
    if (isHandoffOrderId(data.order.id)) {
      toast.info(t("side.handoffReceptionDemo"));
      return;
    }
    await supabase.from("orders").update({ status: "completed", items_remaining: 0 }).eq("id", data.order.id);
    for (const s of data.shipments) {
      await supabase.from("shipments").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", s.id);
    }
    for (const li of data.lineItems) {
      await supabase.from("line_items").update({ remaining: 0 }).eq("id", li.id);
    }
    setCheckedItems({});
    refetch();
    toast.success(t("side.toastReceptionOk"), {
      description: `${data.lineItems.length} ${t("side.toastReceptionDesc")}`,
    });
  };

  const [joblistItems, setJoblistItems] = useState<Record<string, boolean>>({});

  const toggleJoblistItem = (itemId: string) => {
    setJoblistItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleReorderItem = (item: LineItemRow) => {
    toast.success(`${item.product_name} ${t("side.toastCart")}`, { description: `${t("side.toastCartDesc")} ${item.quantity}` });
  };

  const handleReorderAll = () => {
    if (!data) return;
    toast.success(`${data.lineItems.length} ${t("side.toastReorderAll")}`, { description: `${t("orders.fromOrder")} ${data.order.order_number}` });
  };

  const handleRequestReturn = () => {
    toast.info(t("detail.returnSoon"));
  };

  const handleContactSalesRep = () => {
    const email = "gisele.michu@rexel.fr";
    const subject = data?.order?.order_number ? `${t("detail.contactRep")} — ${data.order.order_number}` : t("detail.contactRep");
    const href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}`;
    window.location.href = href;
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
      setActiveTab("detail");
      setCheckedItems({});
      setShowAllItems(false);
    }
  };

  const receptionEnabled = !!data && ["on_track", "in_transit", "partially_delivered", "completed"].includes(data.order.status);

  const tabs = useMemo(
    () =>
      [
        { key: "detail" as const, label: t("side.tabDetail"), icon: Package, disabled: false },
        { key: "documents" as const, label: t("side.tabDocuments"), icon: FileText, disabled: false },
        { key: "reception" as const, label: t("side.tabReception"), icon: ClipboardCheck, disabled: !receptionEnabled },
      ] as const,
    [t, receptionEnabled]
  );

  const docGroups = groupDocsByType(MOCK_DOCUMENTS);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[50vw] sm:min-w-[480px] p-0 flex flex-col [&>button]:hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !data ? (
          <div className="p-6 text-center text-[var(--color-text-secondary)]">{t("side.notFound")}</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-20 bg-[var(--color-bg-page)] border-b border-[var(--color-border-subtle)] shadow-sm">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CopyPill text={data.order.order_number} />
                      {(() => {
                        const meta = statusVisual[data.order.status] ?? statusVisual.on_track;
                        const Icon = meta.icon;
                        return (
                          <span className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold", meta.bgClass, meta.colorClass)}>
                            <Icon className="h-3 w-3 shrink-0" />
                            {t(`orderStatus.${data.order.status}`)}
                          </span>
                        );
                      })()}
                    </div>
                    <button type="button" onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-x-3 mt-3">
                    <p className="text-[13px] text-[var(--color-text-secondary)]">
                      {t("side.ordered")}{" "}
                      <span className="font-semibold text-[var(--color-text-primary)]">{formatDate(data.order.order_date, "dd/MM/yyyy")}</span>
                      <span className="text-[#a8a8a8] mx-2">|</span>
                      <span className="font-heading font-semibold text-[var(--color-text-primary)]">{formatCurrency(data.order.total_amount)}</span>
                    </p>
                    {data.order.project_name && (
                      <span className="inline-flex h-7 items-center rounded-[4px] bg-[var(--color-bg-layer-01)] px-3 text-[12px] font-semibold text-[var(--color-text-secondary)] shrink-0">
                        {data.order.project_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex px-6 border-b border-[var(--color-border-subtle)]">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      disabled={tab.disabled}
                      onClick={() => !tab.disabled && setActiveTab(tab.key)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-3 text-[13px] font-semibold border-b-2 -mb-px transition-colors",
                        tab.disabled
                          ? "border-transparent text-[var(--color-text-placeholder)] cursor-not-allowed opacity-50"
                          : activeTab === tab.key
                            ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                            : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "detail" && (
                <div className="px-6 py-5 space-y-5">

                  {data.order.expected_delivery && data.order.status !== "completed" && data.order.status !== "cancelled" && (() => {
                    const isDelayed = data.order.status === "delayed";
                    const isPartial = data.order.status === "partially_delivered";
                    const isWarning = isDelayed || isPartial;
                    const bgColor = isWarning ? "bg-[var(--color-alert-error-bg)]" : "bg-[var(--color-alert-info-bg)]";
                    const borderColor = isWarning ? "border-[var(--color-alert-error-border)]" : "border-[var(--color-info)]";
                    const textColor = isWarning ? "text-[var(--color-alert-error-text)]" : "text-[var(--color-info)]";
                    const Icon = isDelayed ? AlertTriangle : Truck;
                    return (
                      <div className={cn("flex items-center gap-2 rounded-[var(--border-radius-sm)] border px-3 min-h-[52px] text-[14px] font-semibold", bgColor, borderColor, textColor)}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>
                          {isDelayed ? t("side.delayedPrefix") : `${t("side.expectedDelivery")} `}
                          {formatDate(data.order.expected_delivery, "dd/MM/yyyy")}
                          {isDelayed && data.order.previous_expected_delivery && (
                            <>
                              {" "}
                              ({t("side.was")} <span className="line-through">{formatDate(data.order.previous_expected_delivery, "dd/MM/yyyy")}</span>)
                            </>
                          )}
                          {isPartial && data.order.items_remaining > 0 && (
                            <>
                              {" "}
                              — {data.order.items_remaining} {t("side.itemsLeft")}
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })()}

                  {data.order.status === "completed" && (
                    <div className="flex items-center gap-2 rounded-[var(--border-radius-sm)] border border-[var(--color-success)] bg-[var(--color-alert-success-bg)] px-3 min-h-[52px] text-[14px] font-semibold text-[var(--color-success)]">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      {t("side.deliveredCompleted")}
                    </div>
                  )}

                  {data.shipments.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{t("side.shipmentsH")}</h3>
                      {data.shipments.map((s) => (
                        <ShipmentMini key={s.id} shipment={s} lineItems={data.lineItems} />
                      ))}
                    </div>
                  )}

                  {(() => {
                    const unassigned = data.lineItems.filter((li) => !li.shipment_id);
                    if (unassigned.length === 0) return null;
                    return (
                      <div className="space-y-3">
                        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{t("side.awaiting")}</h3>
                        {(showAllItems ? unassigned : unassigned.slice(0, 5)).map((item) => (
                          <div key={item.id} className="flex items-start justify-between text-[13px] rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-10 w-10 shrink-0 rounded border border-[#E0E4EB] bg-[#F6F8FB] flex items-center justify-center"><Package className="h-5 w-5 text-[#a8a8a8]" /></div>
                              <div className="min-w-0 space-y-1">
                                <p className="font-semibold text-[var(--color-text-primary)] truncate">{item.product_name}</p>
                                <CopyPill text={item.product_reference} />
                              </div>
                            </div>
                            <div className="flex items-start gap-4 shrink-0 ml-3">
                              <div className="flex flex-col items-end text-right gap-1">
                                <p className="text-[13px] leading-[16px] text-[var(--color-text-primary)]">×{item.quantity}</p>
                                <p className="text-[12px] leading-[16px] text-[var(--color-text-secondary)] font-heading font-semibold">{formatCurrency(item.unit_price)}</p>
                              </div>
                              <div className="flex items-start gap-[8px]">
                                <button
                                  type="button"
                                  onClick={() => toggleJoblistItem(item.id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                                  title="Ajouter à une joblist"
                                >
                                  <Star className="h-3.5 w-3.5" fill={joblistItems[item.id] ? "currentColor" : "none"} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReorderItem(item)}
                                  className={cn(
                                    "h-8 flex items-center justify-center gap-1.5 rounded-[var(--border-radius-sm)] bg-white border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors",
                                    "w-8 px-0 lg:w-auto lg:px-2"
                                  )}
                                  title={t("side.reorderItem")}
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span className="hidden lg:inline text-[12px] font-semibold">{t("common.reorder")}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {(() => {
                    const assigned = data.lineItems.filter((li) => li.shipment_id);
                    if (assigned.length === 0) return null;
                    const visible = showAllItems ? assigned : assigned.slice(0, 5);
                    const totalItems = data.lineItems.length;
                    const hiddenCount = totalItems - (showAllItems ? totalItems : Math.min(5, data.lineItems.filter((li) => !li.shipment_id).length) + Math.min(5, assigned.length));
                    return (
                      <div className="space-y-3">
                        <h3 className="text-[13px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{t("side.allItems")}</h3>
                        {visible.map((item) => (
                          <div key={item.id} className="flex items-start justify-between text-[13px] rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-10 w-10 shrink-0 rounded border border-[#E0E4EB] bg-[#F6F8FB] flex items-center justify-center"><Package className="h-5 w-5 text-[#a8a8a8]" /></div>
                              <div className="min-w-0 space-y-1">
                                <p className="font-semibold text-[var(--color-text-primary)] truncate">{item.product_name}</p>
                                <CopyPill text={item.product_reference} />
                              </div>
                            </div>
                            <div className="flex items-start gap-4 shrink-0 ml-3">
                              <div className="flex flex-col items-end text-right gap-1">
                                <p className="text-[13px] leading-[16px] text-[var(--color-text-primary)]">×{item.quantity}</p>
                                <p className="text-[12px] leading-[16px] text-[var(--color-text-secondary)] font-heading font-semibold">{formatCurrency(item.unit_price)}</p>
                              </div>
                              <div className="flex items-start gap-[8px]">
                                <button
                                  type="button"
                                  onClick={() => toggleJoblistItem(item.id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                                  title="Ajouter à une joblist"
                                >
                                  <Star className="h-3.5 w-3.5" fill={joblistItems[item.id] ? "currentColor" : "none"} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReorderItem(item)}
                                  className={cn(
                                    "h-8 flex items-center justify-center gap-1.5 rounded-[var(--border-radius-sm)] bg-white border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors",
                                    "w-8 px-0 lg:w-auto lg:px-2"
                                  )}
                                  title={t("side.reorderItem")}
                                >
                                  <ShoppingCart className="h-3.5 w-3.5" />
                                  <span className="hidden lg:inline text-[12px] font-semibold">{t("common.reorder")}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {!showAllItems && data.lineItems.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllItems(true)}
                      className="w-full inline-flex items-center justify-center h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[13px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
                    >
                      {t("side.showMore")} ({data.lineItems.length - 5})
                    </button>
                  )}
                  {showAllItems && data.lineItems.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllItems(false)}
                      className="w-full inline-flex items-center justify-center h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[13px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
                    >
                      {t("side.showLess")}
                    </button>
                  )}

                  <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-4">
                    <p className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">{t("side.salesRep")}</p>
                    <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Gisèle Michu — Agence Paris-Est</p>
                    <p className="text-[12px] text-[var(--color-text-secondary)] mt-1">
                      <Phone className="inline h-3 w-3 mr-1" />
                      01 23 45 67 89
                      <span className="mx-1.5">·</span>
                      <Mail className="inline h-3 w-3 mr-1" />
                      gisele.michu@rexel.fr
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="px-6 py-5 space-y-5">
                  <p className="text-[12px] text-[var(--color-text-secondary)]">
                    {MOCK_DOCUMENTS.length} {t("side.docsCount")}
                  </p>
                  {Object.entries(docGroups).map(([type, docs]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                          {type} ({docs.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => toast.success(`${t("side.downloading")} ${docs.length} ${type}`)}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-primary)] hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          {t("side.downloadAll")}
                        </button>
                      </div>
                      {docs.map((doc, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-3 hover:bg-[var(--color-bg-layer-01)] transition-colors cursor-pointer group">
                          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--border-radius-sm)] bg-[var(--color-rexel-primary-10)] text-[var(--color-primary)] shrink-0">
                            <doc.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{doc.name}</p>
                            <p className="text-[12px] text-[var(--color-text-secondary)]">{formatDate(doc.date, "dd/MM/yyyy")}</p>
                          </div>
                          <button type="button" className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "reception" && (
                <div className="px-6 py-5 space-y-4">
                  {isCompletedOrder && (
                    <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-success)] bg-[var(--color-alert-success-bg)] p-3 min-h-[52px] text-[14px] text-[var(--color-success)] flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      {t("side.receptionDone")}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-[var(--color-text-secondary)]">
                      {isCompletedOrder ? t("side.allReceived") : t("side.checkReceived")}
                    </p>
                    {!isCompletedOrder && (
                      <button type="button" onClick={checkAll} className="text-[12px] font-semibold text-[var(--color-primary)] hover:underline">
                        {t("side.checkAll")}
                      </button>
                    )}
                  </div>

                  {data.lineItems.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-3 transition-colors",
                        isCompletedOrder ? "opacity-80" : "cursor-pointer hover:bg-[var(--color-bg-layer-01)]"
                      )}
                    >
                      <Checkbox
                        checked={!!checkedItems[item.id]}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-0.5"
                        disabled={isCompletedOrder}
                      />
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded border border-[#E0E4EB] bg-[#F6F8FB] flex items-center justify-center"><Package className="h-5 w-5 text-[#a8a8a8]" /></div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-[13px] font-semibold text-[var(--color-text-primary)] truncate",
                              checkedItems[item.id] && "line-through text-[var(--color-text-secondary)]"
                            )}
                          >
                            {item.product_name}
                          </p>
                          <p className="text-[12px] text-[var(--color-text-secondary)]">
                            <CopyPill text={item.product_reference} /> — {t("common.qty")}: {item.quantity}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}

                  <div className="pt-1 text-center text-[12px] text-[var(--color-text-secondary)]">
                    {checkedCount}/{data.lineItems.length} {t("side.checked")}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] px-6 py-4 flex flex-col items-stretch gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleRequestReturn}
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-white text-[13px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {t("detail.requestReturn")}
                </button>
                <button
                  type="button"
                  onClick={handleContactSalesRep}
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-white text-[13px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  {t("detail.contactRep")}
                </button>
              </div>

              {activeTab === "reception" ? (
                <button
                  type="button"
                  disabled={!allChecked || isCompletedOrder}
                  onClick={handleValidateReception}
                  className={cn(
                    "w-full inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] text-[13px] font-semibold transition-colors",
                    allChecked && !isCompletedOrder
                      ? "bg-[var(--color-success)] text-white hover:opacity-90"
                      : "bg-[var(--color-bg-layer-01)] text-[var(--color-text-placeholder)] cursor-not-allowed"
                  )}
                >
                  <Check className="h-4 w-4" />{" "}
                  {isCompletedOrder
                    ? t("side.alreadyValidated")
                    : `${t("side.validateReception")} (${checkedCount}/${data.lineItems.length})`}
                </button>
              ) : (
                <div className="flex flex-col gap-[8px]">
                  <button
                    type="button"
                    onClick={handleReorderAll}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] bg-[var(--color-primary)] text-[var(--color-white)] text-[13px] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" /> {t("side.reorderAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success("Ajouté à la joblist")}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] text-[13px] font-semibold hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                  >
                    <Star className="h-4 w-4" /> Ajouter à une joblist
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
