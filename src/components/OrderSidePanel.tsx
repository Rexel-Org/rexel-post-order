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
  being_prepared: { icon: Package, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  in_transit: { icon: Truck, colorClass: "text-[var(--color-info)]", bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]" },
  partially_delivered: {
    icon: Package,
    colorClass: "text-[var(--color-alert-warning-text)]",
    bgClass: "bg-[var(--color-alert-warning-bg)] border-[var(--color-alert-warning-border)]",
  },
  backorder: {
    icon: AlertTriangle,
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

function CopyPill({ text, className }: { text: string; className?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        toast.success(t("common.copied"));
      }}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-white px-3 text-[12px] font-semibold text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors",
        className
      )}
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
  const shipmentDeliveredQty = items.reduce((sum, li) => sum + (li.quantity - li.remaining), 0);
  const shipmentTotalQty = items.reduce((sum, li) => sum + li.quantity, 0);
  const isShipmentDelivered = shipment.status === "delivered";

  return (
    <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">
            {t("delivery.shipmentN")} {shipment.shipment_index}
          </span>
          {shipmentTotalQty > 0 && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold",
                isShipmentDelivered
                  ? "bg-[var(--color-alert-success-bg)] text-[var(--color-success)]"
                  : "bg-[var(--color-bg-layer-01)] text-[var(--color-text-secondary)]"
              )}
            >
              {shipmentDeliveredQty}/{shipmentTotalQty} {isShipmentDelivered ? "delivered" : "in transit"}
            </span>
          )}
        </div>
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
    const normalizedType = (() => {
      const t = doc.type.trim();
      const low = t.toLowerCase();
      if (low.includes("pro-forma") || low.includes("pro forma")) return "Invoice";
      return t;
    })();
    if (!groups[normalizedType]) groups[normalizedType] = [];
    groups[normalizedType].push(doc);
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
  const [expandedDocName, setExpandedDocName] = useState<string | null>(null);
  const [showMoreDeliveryNote, setShowMoreDeliveryNote] = useState(false);

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

  useEffect(() => {
    setShowMoreDeliveryNote(false);
  }, [expandedDocName]);

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

  const receptionEnabled = !!data && ["in_transit", "partially_delivered", "completed"].includes(data.order.status);

  const tabs = useMemo(
    () =>
      [
        { key: "detail" as const, label: t("side.tabDetail"), icon: Package, disabled: false },
        { key: "documents" as const, label: t("side.tabDocuments"), icon: FileText, disabled: false },
        { key: "reception" as const, label: t("side.tabReception"), icon: ClipboardCheck, disabled: !receptionEnabled },
      ] as const,
    [t, receptionEnabled]
  );

  const fulfillmentMode: "delivery" | "pickup" = data?.order?.delivery_address ? "delivery" : "pickup";
  const fulfillmentModeLabel =
    fulfillmentMode === "delivery" ? t("side.fulfillmentDelivery") : t("side.fulfillmentPickup");

  const receptionContact = useMemo(() => {
    const raw = data?.order?.delivery_address as Record<string, unknown> | null | undefined;
    const read = (...keys: string[]) => {
      for (const k of keys) {
        const v = raw?.[k];
        if (typeof v === "string" && v.trim().length > 0) return v.trim();
      }
      return undefined;
    };

    const firstName = read(
      `${fulfillmentMode}_contact_first_name`,
      `${fulfillmentMode}_contact_firstname`,
      `${fulfillmentMode}_contact_given_name`,
      "contact_first_name",
      "contact_firstname",
      "reception_first_name",
      "pickup_first_name"
    );
    const lastName = read(
      `${fulfillmentMode}_contact_last_name`,
      `${fulfillmentMode}_contact_lastname`,
      `${fulfillmentMode}_contact_family_name`,
      "contact_last_name",
      "contact_lastname",
      "reception_last_name",
      "pickup_last_name"
    );
    const phone = read(
      `${fulfillmentMode}_contact_phone`,
      `${fulfillmentMode}_contact_mobile`,
      "contact_phone",
      "contact_mobile",
      "phone",
      "mobile",
      "reception_phone",
      "pickup_phone"
    );
    const email =
      read(
        `${fulfillmentMode}_contact_email`,
        "contact_email",
        "reception_email",
        "pickup_email"
      ) ?? (data?.order?.customer_email ?? undefined);

    const name = [firstName, lastName].filter(Boolean).join(" ").trim();
    const mock =
      fulfillmentMode === "delivery"
        ? { name: "Camille Dupont", phone: "06 12 34 56 78", email: "camille.dupont@exemple.fr" }
        : { name: "Thomas Martin", phone: "06 98 76 54 32", email: "thomas.martin@exemple.fr" };

    return {
      name: name.length > 0 ? name : mock.name,
      phone: phone ?? mock.phone,
      email: email ?? mock.email,
    };
  }, [data?.order?.customer_email, data?.order?.delivery_address, fulfillmentMode]);

  const contactShort = useMemo(() => {
    const full = receptionContact.name.trim();
    if (!full || full === "—") return "—";
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const firstInitial = parts[0][0] ? `${parts[0][0].toUpperCase()}.` : "";
    const last = parts[parts.length - 1];
    return `${firstInitial} ${last}`.trim();
  }, [receptionContact.name]);

  const fulfillmentAddress = useMemo(() => {
    const raw = data?.order?.delivery_address as Record<string, string> | null | undefined;
    const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    if (!raw) {
      return { titleLine: "", streetLine: "", zipCityLine: "" };
    }

    const titleLine = [clean(raw.company), clean(raw.site), clean(raw.name)].filter(Boolean)[0] ?? "";
    const streetLine =
      [clean(raw.line1), clean(raw.line2), clean(raw.street)].filter(Boolean).join(", ") || "";

    const zip =
      clean(raw.zip) || clean(raw.postal_code) || clean(raw.postcode);
    const city = clean(raw.city);
    const zipCityLine = [zip, city].filter(Boolean).join(" ").trim();

    return { titleLine, streetLine, zipCityLine };
  }, [data?.order?.delivery_address]);

  const documentsForOrder = useMemo(() => {
    const dynamicDeliveryNotes =
      data?.shipments?.map((s) => {
        const baseId = data.order.order_number.replace(/\s+/g, "-");
        const name = `Delivery note BL-${baseId}-${String(s.shipment_index).padStart(2, "0")}`;
        const date = (s.delivered_at ?? s.expected_delivery ?? data.order.order_date) as string;
        return { name, type: "Delivery note", date, icon: FileText };
      }) ?? [];

    const staticDocs = MOCK_DOCUMENTS.filter((d) => d.type !== "Delivery note");
    return [...dynamicDeliveryNotes, ...staticDocs];
  }, [data?.order?.order_date, data?.order?.order_number, data?.shipments]);

  const docGroups = useMemo(() => groupDocsByType(documentsForOrder), [documentsForOrder]);

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
              <div className="sticky top-0 z-20 bg-[var(--color-bg-page)]">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                      <CopyPill text={data.order.order_number} />
                      {(() => {
                        const meta = statusVisual[data.order.status] ?? statusVisual.in_transit;
                        const Icon = meta.icon;
                        return (
                          <span className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold", meta.bgClass, meta.colorClass)}>
                            <Icon className="h-3 w-3 shrink-0" />
                            {t(`orderStatus.${data.order.status}`)}
                          </span>
                        );
                      })()}
                      </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-01)] px-3 py-2.5">
                    {/* Primary row */}
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:items-center">
                      <div className="text-[14px] leading-[20px] text-[var(--color-text-primary)]">
                        <span className="text-[var(--color-text-secondary)]">{t("side.ordered")} </span>
                        <span className="font-semibold">{formatDate(data.order.order_date, "dd/MM/yyyy")}</span>
                      </div>
                      <div className="text-[14px] leading-[20px] sm:text-right">
                        <span className="font-heading font-semibold text-[var(--color-text-primary)]">
                          {formatCurrency(data.order.total_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Secondary row */}
                    <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 sm:items-start">
                      <div className="text-[12px] leading-[16px] text-[var(--color-text-secondary)] break-words">
                        {t("side.orderedBy")}{" "}
                        <span className="font-semibold text-[var(--color-text-primary)]">
                          {data.order.customer_email ?? "camille.dupont@exemple.fr"}
                        </span>
                      </div>
                      <div className="text-[12px] leading-[16px] text-[var(--color-text-secondary)] break-all sm:text-right">
                        <span className="font-semibold">{t("side.orderId")}:</span> {data.order.id}
                      </div>
                    </div>

                    {data.order.project_name && (
                      <div className="mt-2">
                        <span className="inline-flex h-6 items-center rounded-[4px] bg-white px-2.5 text-[12px] font-semibold text-[var(--color-text-secondary)]">
                          {data.order.project_name}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[var(--border-radius-sm)] bg-white shadow-[var(--shadow-1)] pt-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                      <div className="px-4 md:pr-5">
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                          {fulfillmentMode === "delivery" ? t("side.deliveryAddressCard") : t("side.pickupAddressCard")}
                        </p>
                        <div className="mt-2 space-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
                          {fulfillmentAddress.titleLine || fulfillmentAddress.streetLine || fulfillmentAddress.zipCityLine ? (
                            <>
                              <div className="font-semibold text-[var(--color-text-primary)] break-words text-[14px]">
                                {fulfillmentAddress.titleLine || "—"}
                              </div>
                              {fulfillmentAddress.streetLine && <div className="break-words mt-1">{fulfillmentAddress.streetLine}</div>}
                              {fulfillmentAddress.zipCityLine && <div className="break-words mt-1">{fulfillmentAddress.zipCityLine}</div>}
                            </>
                          ) : (
                            <div>—</div>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[var(--color-text-secondary)]">Contact :</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">{contactShort}</span>
                            <span className="text-[#a8a8a8]">·</span>
                            <span className="font-semibold text-[var(--color-text-primary)]">{receptionContact.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-[var(--color-border-subtle)] px-4 md:mt-0 md:border-t-0 md:border-l md:border-[var(--color-border-subtle)] md:pl-5">
                        <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{t("side.billingCard")}</p>
                        <div className="mt-2 space-y-1 text-[12px] text-[var(--color-text-secondary)]">
                          <div className="font-semibold text-[var(--color-text-primary)]">
                            {data.order.project_name ?? "SAS Martin Électricité"}
                          </div>
                          <div>
                            {t("common.po")}{" "}
                            <span className="font-semibold text-[var(--color-text-primary)]">{data.order.po_number ?? "PO-4521"}</span>
                          </div>
                          <div>{t("side.billingTerms")}</div>
                        </div>
                      </div>
                    </div>
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
                        "flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold border-b-2 -mb-px transition-colors",
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
                    const isBackorder = data.order.status === "backorder";
                    const bgColor = isDelayed || isBackorder
                      ? "bg-[var(--color-alert-error-bg)]"
                      : isPartial
                        ? "bg-[var(--color-alert-warning-bg)]"
                        : "bg-[var(--color-alert-info-bg)]";
                    const borderColor = isDelayed || isBackorder
                      ? "border-[var(--color-alert-error-border)]"
                      : isPartial
                        ? "border-[var(--color-alert-warning-border)]"
                        : "border-[var(--color-info)]";
                    const textColor = isDelayed || isBackorder
                      ? "text-[var(--color-alert-error-text)]"
                      : isPartial
                        ? "text-[var(--color-alert-warning-text)]"
                        : "text-[var(--color-info)]";
                    const Icon = isDelayed || isBackorder ? AlertTriangle : Truck;
                    return (
                      <div className={cn("flex items-center gap-2 rounded-[var(--border-radius-sm)] border px-3 min-h-[52px] text-[14px] font-semibold", bgColor, borderColor, textColor)}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>
                          {isDelayed ? t("side.delayedPrefix") : isBackorder ? `${t("side.expectedDelivery")} ` : `${t("side.expectedDelivery")} `}
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

                  {data.shipments.length > 0 && (() => {
                    const totalQty = data.lineItems.reduce((s, li) => s + li.quantity, 0);
                    const deliveredQty = data.lineItems.reduce((s, li) => s + (li.quantity - li.remaining), 0);
                    const remainingQty = totalQty - deliveredQty;
                    const pct = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;
                    const showRecap = totalQty > 0 && deliveredQty < totalQty && deliveredQty > 0;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{t("side.shipmentsH")}</h3>
                          {showRecap && (
                            <span className="text-[12px] text-[var(--color-text-secondary)]">
                              <span className="font-semibold text-[var(--color-text-primary)]">{deliveredQty}</span> of {totalQty} delivered · <span className="font-semibold text-[var(--color-text-primary)]">{remainingQty}</span> remaining
                            </span>
                          )}
                        </div>
                        {data.shipments.map((s) => (
                          <ShipmentMini key={s.id} shipment={s} lineItems={data.lineItems} />
                        ))}
                      </div>
                    );
                  })()}

                  {(() => {
                    const unassigned = data.lineItems.filter((li) => !li.shipment_id);
                    if (unassigned.length === 0) return null;
                    return (
                      <div className="space-y-3">
                        <h3 className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{t("side.awaiting")}</h3>
                        {(showAllItems ? unassigned : unassigned.slice(0, 5)).map((item) => (
                          <div key={item.id} className="flex items-start justify-between text-[12px] rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-10 w-10 shrink-0 rounded border border-[#E0E4EB] bg-[#F6F8FB] flex items-center justify-center"><Package className="h-5 w-5 text-[#a8a8a8]" /></div>
                              <div className="min-w-0 space-y-1">
                                <p className="font-semibold text-[var(--color-text-primary)] truncate">{item.product_name}</p>
                                <CopyPill text={item.product_reference} />
                              </div>
                            </div>
                            <div className="flex items-start gap-4 shrink-0 ml-3">
                              <div className="flex flex-col items-end text-right gap-1">
                                <p className="text-[12px] leading-[16px] text-[var(--color-text-primary)]">×{item.quantity}</p>
                                <p className="text-[12px] leading-[16px] text-[var(--color-text-secondary)] font-heading font-semibold">{formatCurrency(item.unit_price)}</p>
                              </div>
                              <div className="flex items-start gap-[8px]">
                                <button
                                  type="button"
                                  onClick={() => toggleJoblistItem(item.id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                                  title={t("side.addToJoblist")}
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
                        <h3 className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{t("side.allItems")}</h3>
                        {visible.map((item) => (
                          <div key={item.id} className="flex items-start justify-between text-[12px] rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="h-10 w-10 shrink-0 rounded border border-[#E0E4EB] bg-[#F6F8FB] flex items-center justify-center"><Package className="h-5 w-5 text-[#a8a8a8]" /></div>
                              <div className="min-w-0 space-y-1">
                                <p className="font-semibold text-[var(--color-text-primary)] truncate">{item.product_name}</p>
                                <CopyPill text={item.product_reference} />
                              </div>
                            </div>
                            <div className="flex items-start gap-4 shrink-0 ml-3">
                              <div className="flex flex-col items-end text-right gap-1">
                                <p className="text-[12px] leading-[16px] text-[var(--color-text-primary)]">×{item.quantity}</p>
                                <p className="text-[12px] leading-[16px] text-[var(--color-text-secondary)] font-heading font-semibold">{formatCurrency(item.unit_price)}</p>
                              </div>
                              <div className="flex items-start gap-[8px]">
                                <button
                                  type="button"
                                  onClick={() => toggleJoblistItem(item.id)}
                                  className="h-8 w-8 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                                  title={t("side.addToJoblist")}
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
                      className="w-full inline-flex items-center justify-center h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[12px] font-semibold text-[var(--color-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
                    >
                      {t("side.showMore")} ({data.lineItems.length - 5})
                    </button>
                  )}
                  {showAllItems && data.lineItems.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllItems(false)}
                      className="w-full inline-flex items-center justify-center h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
                    >
                      {t("side.showLess")}
                    </button>
                  )}

                  <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-4">
                    <p className="text-[12px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">{t("side.salesRep")}</p>
                    <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">Gisèle Michu — Agence Paris-Est</p>
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
                    {documentsForOrder.length} {t("side.docsCount")}
                  </p>
                  {Object.entries(docGroups).map(([type, docs]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[12px] font-semibold text-[var(--color-text-primary)]">
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
                        <div key={i} className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] p-3 hover:bg-[var(--color-bg-layer-01)] transition-colors group">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--border-radius-sm)] bg-[var(--color-rexel-primary-10)] text-[var(--color-primary)] shrink-0">
                              <doc.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-semibold text-[var(--color-text-primary)] truncate">{doc.name}</p>
                              <p className="text-[12px] text-[var(--color-text-secondary)]">{formatDate(doc.date, "dd/MM/yyyy")}</p>
                            </div>

                            {type === "Delivery note" && (
                              <button
                                type="button"
                                onClick={() => setExpandedDocName((p) => (p === doc.name ? null : doc.name))}
                                className="hidden sm:inline-flex h-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] px-2 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
                              >
                                {expandedDocName === doc.name ? t("side.hideDetails") : t("side.viewDetails")}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toast.success(`${t("side.downloading")} 1 ${type}`)}
                              className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-all"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>

                          {type === "Delivery note" && expandedDocName === doc.name && data && (
                            <div className="mt-3 rounded-[var(--border-radius-sm)] bg-white border border-[var(--color-border-subtle)] p-3 space-y-3">
                              <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                {t("side.deliveryNoteDetails")}
                              </p>

                              {(() => {
                                const shipmentIdxMatch = doc.name.match(/-(\d{2})$/);
                                const shipmentIndex = shipmentIdxMatch ? Number(shipmentIdxMatch[1]) : null;
                                const shipment = shipmentIndex
                                  ? data.shipments.find((s) => s.shipment_index === shipmentIndex)
                                  : undefined;
                                const items = shipment ? data.lineItems.filter((li) => li.shipment_id === shipment.id) : [];
                                if (items.length === 0) return null;

                                const siteRef = data.order.project_name ?? "R4";
                                const invoiceNumber = `INV-${data.order.order_number}`;
                                const invoiceDate = data.order.order_date;
                                const orderType = data.order.order_type || "Standard";
                                const passedBy = data.order.customer_email ?? "salesemployee_benjamin.hodeau@rexel.fr";
                                const carrier = shipment?.carrier ?? "Rexel Express";
                                const trackingNumber = "Non communiqué";
                                const weightKg = 0;
                                const nbRefs = items.length;
                                const nbParcels = 0;

                                return (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-[12px] text-[var(--color-text-secondary)]">
                                      <div className="space-y-1">
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.deliveryMode")}</span>{" "}{fulfillmentModeLabel}</div>
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.siteRef")}</span>{" "}{siteRef}</div>
                                        <div className="break-words">
                                          <span className="font-semibold text-[var(--color-text-primary)]">{t("side.addressLabel")}</span>{" "}
                                          {[fulfillmentAddress.titleLine, fulfillmentAddress.streetLine, fulfillmentAddress.zipCityLine]
                                            .filter(Boolean)
                                            .join(", ") || "—"}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="font-semibold text-[var(--color-text-primary)]">{t(`orderStatus.${data.order.status}`)}</div>
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.carrier")}</span>{" "}{carrier}</div>
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.trackingNumber")}</span>{" "}{trackingNumber}</div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-text-secondary)]">
                                        <span><span className="font-semibold text-[var(--color-text-primary)]">{t("side.nbRefs")}</span>{" "}{nbRefs}</span>
                                        <span><span className="font-semibold text-[var(--color-text-primary)]">{t("side.nbParcels")}</span>{" "}{nbParcels}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setShowMoreDeliveryNote((v) => !v)}
                                        className="shrink-0 text-[12px] font-semibold text-[var(--color-primary)] hover:underline"
                                      >
                                        {showMoreDeliveryNote ? t("side.lessInfo") : t("side.moreInfo")}
                                      </button>
                                    </div>

                                    {showMoreDeliveryNote && (
                                      <div className="rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-01)] p-3 text-[12px] text-[var(--color-text-secondary)] space-y-1">
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.passedBy")}</span>{" "}{passedBy}</div>
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.invoiceNumber")}</span>{" "}{invoiceNumber}</div>
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.invoiceDate")}</span>{" "}{formatDate(invoiceDate, "dd/MM/yyyy")}</div>
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.orderType")}</span>{" "}{orderType}</div>
                                        <div><span className="font-semibold text-[var(--color-text-primary)]">{t("side.weightKg")}</span>{" "}{weightKg}</div>
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      {items.slice(0, 3).map((li) => (
                                        <div key={li.id} className="flex items-center gap-2 text-[12px] text-[var(--color-text-secondary)]">
                                          <div className="h-6 w-6 shrink-0 rounded border border-[#E0E4EB] bg-[#F6F8FB] flex items-center justify-center">
                                            <Package className="h-3 w-3 text-[#a8a8a8]" />
                                          </div>
                                          <span className="truncate text-[var(--color-text-primary)]">{li.product_name}</span>
                                          <span className="ml-auto shrink-0">×{li.quantity}</span>
                                        </div>
                                      ))}
                                      {items.length > 3 && (
                                        <div className="text-[12px] text-[var(--color-text-secondary)]">
                                          +{items.length - 3} {t("side.items")}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
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
                              "text-[12px] font-semibold text-[var(--color-text-primary)] truncate",
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
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-white text-[12px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  {t("detail.requestReturn")}
                </button>
                <button
                  type="button"
                  onClick={handleContactSalesRep}
                  className="inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-white text-[12px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
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
                    "w-full inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] text-[12px] font-semibold transition-colors",
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
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] bg-[var(--color-primary)] text-[var(--color-white)] text-[12px] font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
                  >
                    <ShoppingCart className="h-4 w-4" /> {t("side.reorderAll")}
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.success(t("orders.joblistAdded"))}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] text-[12px] font-semibold hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                  >
                    <Star className="h-4 w-4" /> {t("side.addToJoblist")}
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
