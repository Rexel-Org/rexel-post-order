import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, X, AlertTriangle, XCircle, CheckCircle, Package,
  Truck, Copy, Download, CalendarIcon, Kanban, List,
  ArrowUpDown, ArrowUp, ArrowDown, ShoppingCart, Star,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OrderSidePanel from "@/components/OrderSidePanel";
import { useOrders, useLineItems, type OrderRow, type LineItemRow } from "@/hooks/useOrders";
import { CHECKOUT_OPEN_PANEL_KEY } from "@/lib/checkoutHandoff";
import { useI18n } from "@/i18n/useI18n";
import { toast } from "sonner";
import { format, subDays, subMonths, subYears, startOfDay, startOfYear } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";





// --- Status config (labels via i18n) ---
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

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const meta = statusVisual[status] ?? statusVisual.in_transit;
  const Icon = meta.icon;
  const label = t(`orderStatus.${status}`);
  return (
    <span className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold", meta.bgClass, meta.colorClass)}>
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

// --- Copy Pill ---
function CopyPill({ text }: { text: string }) {
  const { t } = useI18n();
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); toast.success(t("common.copied")); }}
      className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-white px-3 text-[12px] font-semibold text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
    >
      {text}
      <Copy className="h-3 w-3 text-[var(--color-primary)]" />
    </button>
  );
}

// --- Date presets (stable ids for i18n) ---
type DatePresetId = "30d" | "3m" | "6m" | "lastYear";
type DatePreset = { id: DatePresetId; getFrom: () => Date };
const datePresets: DatePreset[] = [
  { id: "30d", getFrom: () => subDays(new Date(), 30) },
  { id: "3m", getFrom: () => subMonths(new Date(), 3) },
  { id: "6m", getFrom: () => subMonths(new Date(), 6) },
  { id: "lastYear", getFrom: () => startOfYear(subYears(new Date(), 1)) },
];

// --- Helpers ---
const ONGOING_STATUSES = ["being_prepared", "in_transit", "delayed"];
const NEEDS_ATTENTION_STATUSES = ["delayed", "cancelled"];

function isOngoing(s: string) { return ONGOING_STATUSES.includes(s); }
function isCompleted(s: string) { return s === "completed"; }
function needsAttention(s: string) { return NEEDS_ATTENTION_STATUSES.includes(s); }

// --- Order Card (list view) ---
function OrderCard({
  order, lineItems, onClick, warning, onReorder, inJoblist, onToggleJoblist,
}: {
  order: OrderRow; lineItems: LineItemRow[]; onClick: () => void; warning?: boolean; onReorder?: () => void; inJoblist?: boolean; onToggleJoblist?: () => void;
}) {
  const { t, formatDate, formatCurrency } = useI18n();
  const orderLineItems = lineItems.filter((li) => li.order_id === order.id);
  const displayItems = orderLineItems.slice(0, 3);
  const moreCount = orderLineItems.length - 3;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-[var(--border-radius-sm)] border border-[#E0E4EB] bg-white p-[var(--spacing-3)] transition-all hover:shadow-[var(--shadow-2)]",
        warning && "relative before:absolute before:left-0 before:top-[8px] before:bottom-[8px] before:w-[4px] before:rounded-[2px] before:bg-[var(--color-error)]"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-[var(--spacing-2)]">
        <div className="flex items-center gap-2">
          <CopyPill text={order.order_number} />
          <StatusBadge status={order.status} />
        </div>
        {order.project_name && (
          <span className="inline-flex h-7 items-center gap-1 rounded-[4px] bg-[#F6F8FB] px-3 font-[var(--font-body)] text-[12px] leading-[16px] font-[var(--font-weight-semibold)] text-[#525252]">
            {order.project_name}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252] mb-[var(--spacing-2)]">
        <span>{t("orders.orderDate")}: {formatDate(order.order_date, "dd/MM/yyyy")}</span>
        <span className="text-[#a8a8a8]">|</span>
        <span className="font-heading font-semibold text-[#161616]">{formatCurrency(order.total_amount)}</span>
        {order.expected_delivery && (
          <>
            <span className="text-[#a8a8a8]">|</span>
            <span className="font-[var(--font-weight-semibold)] text-[#003399]">
              <Truck className="inline h-3 w-3 mr-0.5" />
              {t("orders.expLabel")} {formatDate(order.expected_delivery, "dd/MM/yyyy")}
            </span>
          </>
        )}
        {order.items_remaining > 0 && (
          <>
            <span className="text-[#a8a8a8]">|</span>
            <span>
              {order.items_remaining} {t("orders.itemsRemaining")}
            </span>
          </>
        )}
      </div>

      {/* Product images + reorder button aligned right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {displayItems.map((li) => (
            <div
              key={li.id}
              className="h-12 w-12 shrink-0 rounded-[var(--border-radius-sm)] bg-[#F6F8FB] border border-[#E0E4EB] flex items-center justify-center"
              title={li.product_name}
            >
              <Package className="h-5 w-5 text-[#a8a8a8]" />
            </div>
          ))}
          {moreCount > 0 && (
            <span className="font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252]">
              +{moreCount} {t("orders.more")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onToggleJoblist && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleJoblist(); }}
              className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
              title={inJoblist ? t("orders.joblistRemove") : t("orders.joblistAdd")}
            >
              <Star className={cn("h-4 w-4", inJoblist && "fill-[var(--color-primary)]")} />
            </button>
          )}
          {onReorder && (
            <button
              onClick={(e) => { e.stopPropagation(); onReorder(); }}
              className={cn(
                "inline-flex h-[32px] items-center justify-center gap-1.5 rounded-[var(--border-radius-sm)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors",
                "w-[32px] px-0 sm:w-auto sm:px-2"
              )}
              title={t("orders.reorderAllTitle")}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline text-[12px] font-semibold">{t("common.reorder")}</span>
            </button>
          )}
        </div>
      </div>

      {order.status === "delayed" && order.previous_expected_delivery && (
        <div className="mt-[var(--spacing-2)] flex items-center gap-[8px] rounded-[var(--border-radius-sm)] border border-[var(--color-alert-error-border)] bg-[var(--color-alert-error-bg)] px-[var(--spacing-2)] min-h-[40px] font-[var(--font-body)] text-[14px] leading-[20px] text-[var(--color-alert-error-text)]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("orders.newDeliveryDate")}: <span className="font-semibold">{formatDate(order.expected_delivery, "dd/MM/yyyy")}</span> {t("orders.insteadOf")}{" "}
            <span className="line-through">{formatDate(order.previous_expected_delivery, "dd/MM/yyyy")}</span>
            {" — "}
            {t("orders.delayedByCarrier")}
          </span>
        </div>
      )}

      {order.status === "partially_delivered" && (
        <div className="mt-[var(--spacing-2)] font-[var(--font-body)] text-[14px] leading-[20px] font-semibold text-[#525252]">
          {order.items_remaining} {t("orders.itemsRemaining")} | {t("orders.nextExpected")}:{" "}
          {formatDate(order.expected_delivery, "dd/MM/yyyy")}
        </div>
      )}
    </div>
  );
}

// --- Sort types for table ---
type SortKey = "order_number" | "po_number" | "order_date" | "status" | "total_amount" | "expected_delivery" | "items_remaining";

// --- Main component ---
export default function OrderHistory() {
  const { t, formatDate, formatCurrency, df } = useI18n();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: lineItems = [], isLoading: itemsLoading } = useLineItems();
  const isLoading = ordersLoading || itemsLoading;

  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDatePreset, setActiveDatePreset] = useState<DatePresetId | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(10);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");

  const toggleStatusFilter = (status: string) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  // Table state
  const [sortKey, setSortKey] = useState<SortKey>("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sidePanelOrder, setSidePanelOrder] = useState<string | null>(null);
  const [isStickyStuck, setIsStickyStuck] = useState(false);
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const [joblistIds, setJoblistIds] = useState<Set<string>>(new Set());
  const toggleJoblist = (orderId: string) => {
    setJoblistIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) { next.delete(orderId); toast.success(t("orders.joblistRemoved")); }
      else { next.add(orderId); toast.success(t("orders.joblistAdded")); }
      return next;
    });
  };
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(CHECKOUT_OPEN_PANEL_KEY);
      if (pending) {
        sessionStorage.removeItem(CHECKOUT_OPEN_PANEL_KEY);
        setSidePanelOrder(pending);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Range picker state
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [rangeMonth, setRangeMonth] = useState<Date>(new Date());

  const projects = useMemo(
    () => [...new Set(orders.map((o) => o.project_name).filter(Boolean))] as string[],
    [orders]
  );

  // In kanban view, ensure a project is always selected (default to first)
  useEffect(() => {
    if (viewMode === "kanban" && projectFilter === "all" && projects.length > 0) {
      setProjectFilter(projects[0]);
    }
  }, [viewMode, projectFilter, projects]);

  const ongoingCount = orders.filter((o) => isOngoing(o.status)).length;
  const backorderCount = orders.filter((o) => o.status === "partially_delivered").length;
  const completedCount = orders.filter((o) => isCompleted(o.status)).length;

  // Filtering
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return orders
      .filter((o) => {
        if (statusFilters.size === 0) return true;
        return statusFilters.has(o.status);
      })
      .filter((o) => {
        if (!q) return true;
        const orderMatch = o.order_number.toLowerCase().includes(q) || (o.po_number?.toLowerCase().includes(q) ?? false) || (o.project_name?.toLowerCase().includes(q) ?? false);
        const itemMatch = lineItems.filter((li) => li.order_id === o.id).some(
          (li) => li.product_name.toLowerCase().includes(q) || li.product_reference.toLowerCase().includes(q) || li.supplier.toLowerCase().includes(q)
        );
        return orderMatch || itemMatch;
      })
      .filter((o) => {
        const d = new Date(o.order_date);
        if (dateFrom && d < startOfDay(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo.getTime() + 86400000)) return false;
        return true;
      })
      .filter((o) => {
        if (projectFilter === "all") return true;
        return o.project_name === projectFilter;
      });
  }, [orders, lineItems, statusFilters, searchQuery, dateFrom, dateTo, projectFilter]);

  // Table sorted data
  const tableSorted = useMemo(() => {
    const statusOrder: Record<string, number> = { delayed: 0, cancelled: 1, partially_delivered: 2, in_transit: 3, being_prepared: 4, completed: 5 };
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "order_number": cmp = a.order_number.localeCompare(b.order_number); break;
        case "po_number": cmp = (a.po_number ?? "").localeCompare(b.po_number ?? ""); break;
        case "order_date": cmp = new Date(a.order_date).getTime() - new Date(b.order_date).getTime(); break;
        case "status": cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99); break;
        case "total_amount": cmp = a.total_amount - b.total_amount; break;
        case "expected_delivery": cmp = new Date(a.expected_delivery ?? 0).getTime() - new Date(b.expected_delivery ?? 0).getTime(); break;
        case "items_remaining": cmp = a.items_remaining - b.items_remaining; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Lazy loading (infinite scroll) — small batches, fires only when sentinel actually intersects
  const LAZY_PAGE_SIZE = 10;
  const visibleRows = tableSorted.slice(0, visibleCount);
  const hasMore = visibleCount < tableSorted.length;
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isLoadingMoreRef = useRef(false);

  useEffect(() => { setVisibleCount(LAZY_PAGE_SIZE); setCurrentPage(1); }, [statusFilters, searchQuery, dateFrom, dateTo, projectFilter, sortKey, sortDir]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;
        // Simulate small async delay so the user perceives progressive loading
        setTimeout(() => {
          setVisibleCount((c) => Math.min(c + LAZY_PAGE_SIZE, tableSorted.length));
          isLoadingMoreRef.current = false;
        }, 250);
      },
      { root: null, rootMargin: "0px", threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, tableSorted.length, visibleCount]);

  // Detect when sticky filter zone becomes "stuck" (sentinel scrolls out of view)
  useEffect(() => {
    const node = stickySentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStickyStuck(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hasActiveFilters = searchQuery || projectFilter !== "all" || dateFrom || dateTo;

  const clearAllFilters = () => {
    setSearchQuery("");
    setProjectFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setActiveDatePreset(null);
  };

  const applyPreset = (id: DatePresetId, getFrom: () => Date) => {
    if (activeDatePreset === id) {
      setActiveDatePreset(null); setDateFrom(undefined); setDateTo(undefined);
    } else {
      setActiveDatePreset(id);
      setDateFrom(startOfDay(getFrom()));
      setDateTo(id === "lastYear" ? new Date(new Date().getFullYear() - 1, 11, 31) : undefined);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };


  const handleReorderAll = (order: OrderRow) => {
    const items = lineItems.filter((li) => li.order_id === order.id);
    toast.success(`${items.length} ${t("orders.itemsAdded")}`, { description: `${t("orders.fromOrder")} ${order.order_number}` });
  };

  const exportCSV = (rows?: OrderRow[]) => {
    const data = rows ?? filtered;
    const csvRows = data.map((o) => ({
      order_number: o.order_number, po_number: o.po_number ?? "", status: o.status,
      order_date: o.order_date, expected_delivery: o.expected_delivery ?? "",
      total_amount: o.total_amount, items_remaining: o.items_remaining, project: o.project_name ?? "",
    }));
    const headers = Object.keys(csvRows[0] ?? {});
    const csv = [headers.join(","), ...csvRows.map((r) => headers.map((h) => `"${(r as any)[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(t("orders.csvExported"));
  };

  // Status filter groups (3 grouped toggles, cumulable)
  const ATTENTION_STATUSES = ["delayed", "cancelled", "backorder", "partially_delivered"];
  const ONGOING_GROUP = ["being_prepared", "in_transit"];
  const COMPLETED_GROUP = ["completed"];

  type StatusGroup = {
    key: string;
    label: string;
    statuses: string[];
    icon: typeof CheckCircle;
    colorClass: string;
    bgClass: string;
  };

  const statusGroups: StatusGroup[] = [
    {
      key: "attention",
      label: "Points d'attention",
      statuses: ATTENTION_STATUSES,
      icon: AlertTriangle,
      colorClass: "text-[var(--color-alert-error-text)]",
      bgClass: "bg-[var(--color-alert-error-bg)] border-[var(--color-alert-error-border)]",
    },
    {
      key: "ongoing",
      label: "En cours",
      statuses: ONGOING_GROUP,
      icon: Truck,
      colorClass: "text-[var(--color-info)]",
      bgClass: "bg-[var(--color-alert-info-bg)] border-[var(--color-info)]",
    },
    {
      key: "completed",
      label: "Terminé",
      statuses: COMPLETED_GROUP,
      icon: CheckCircle,
      colorClass: "text-[var(--color-success)]",
      bgClass: "bg-[var(--color-alert-success-bg)] border-[var(--color-success)]",
    },
  ];

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of statusGroups) {
      counts[g.key] = orders.filter((o) => g.statuses.includes(o.status)).length;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const toggleGroupFilter = (group: StatusGroup) => {
    setStatusFilters((prev) => {
      // Single-select: clicking an active group clears it; clicking another replaces.
      const isActive = group.statuses.some((s) => prev.has(s));
      if (isActive) return new Set();
      return new Set(group.statuses);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  // --- Table header cell ---
  const SortableHeader = ({ colKey, label, align = "left" }: { colKey: SortKey; label: string; align?: "left" | "right" }) => {
    const active = sortKey === colKey;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th
        onClick={() => toggleSort(colKey)}
        className={cn(
          "cursor-pointer select-none px-4 py-3 text-[12px] font-semibold uppercase tracking-wider transition-colors hover:text-[var(--color-primary)]",
          align === "right" ? "text-right" : "text-left",
          active ? "text-[var(--color-primary)]" : "text-[var(--color-text-secondary)]",
        )}
      >
        <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
          {label}
          <Icon className={cn("h-3 w-3", active ? "opacity-100" : "opacity-40")} />
        </span>
      </th>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="font-heading text-[var(--font-size-xl)] font-semibold leading-[var(--line-height-xl)] text-[var(--color-text-primary)]">
          {t("orders.title")}
        </h1>
        <p className="mt-1 font-[var(--font-body)] text-[12px] leading-[16px] text-[var(--color-text-secondary)]">
          {t("orders.subtitle")}
        </p>
      </div>

      {/* Sentinel to detect sticky "stuck" state */}
      <div ref={stickySentinelRef} className="h-px w-full" aria-hidden />

      {/* Sticky filter zone — KPI cards + filter bar grouped together */}
      <div className="sticky top-[var(--flow-sticky-site-header-height,140px)] z-30 -mx-1 space-y-2 bg-[var(--color-bg-page)] px-1 pb-[var(--spacing-3)] pt-[var(--spacing-2)] mb-[var(--spacing-4)]">
        {/* Status filter cards (3 grouped toggles) — hidden in kanban view (column headers already show this info) */}
        {viewMode !== "kanban" && (
        <div className={cn("grid grid-cols-1 transition-all duration-200", isStickyStuck ? "gap-2 sm:grid-cols-3" : "gap-3 sm:grid-cols-3")}>
          {statusGroups.map((group) => {
            const active = group.statuses.some((s) => statusFilters.has(s));
            const Icon = group.icon;
            const count = groupCounts[group.key] ?? 0;
            return (
              <button
                key={group.key}
                onClick={() => toggleGroupFilter(group)}
                aria-pressed={active}
                className={cn(
                  "flex items-center rounded-[var(--border-radius-sm)] border bg-white text-left transition-all duration-200",
                  isStickyStuck ? "gap-2.5 px-3 py-2" : "gap-3 px-4 py-3",
                  active
                    ? "border-[var(--color-primary)] shadow-[var(--shadow-1)] ring-1 ring-[var(--color-primary)]"
                    : "border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-1)]"
                )}
              >
                <span className={cn("flex shrink-0 items-center justify-center rounded-[var(--border-radius-sm)] border transition-all duration-200", isStickyStuck ? "h-7 w-7" : "h-9 w-9", group.bgClass)}>
                  <Icon className={cn("transition-all duration-200", isStickyStuck ? "h-3.5 w-3.5" : "h-4 w-4", group.colorClass)} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("font-heading font-semibold leading-none text-[var(--color-text-primary)] transition-all duration-200", isStickyStuck ? "text-[16px]" : "text-[20px]")}>{count}</div>
                  <div className={cn("truncate text-[var(--color-text-secondary)] transition-all duration-200", isStickyStuck ? "mt-0.5 text-[12px] leading-[14px]" : "mt-1 text-[12px] leading-[14px]")}>{group.label}</div>
                </div>
              </button>
            );
          })}
        </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-placeholder)]" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              className="h-10 w-full rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] pl-9 pr-9 text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {viewMode !== "kanban" && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[220px] h-10 border-[var(--color-border-subtle)] text-[12px]">
                <SelectValue placeholder={t("orders.allProjects")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.allProjects")}</SelectItem>
                {projects.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
          )}

          <button onClick={() => exportCSV()} className="inline-flex h-10 items-center gap-1.5 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] px-4 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors">
            <Download className="h-4 w-4" />
            {t("orders.exportCsv")}
          </button>

          {/* View toggle */}
          <div className="flex items-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={cn("flex h-10 w-10 items-center justify-center transition-colors",
                viewMode === "table" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-bg-layer-02)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title={t("orders.tableView")}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={cn("flex h-10 w-10 items-center justify-center transition-colors",
                viewMode === "kanban" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-bg-layer-02)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title="Kanban"
            >
              <Kanban className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Date chips + range picker */}
        <div className="flex items-center gap-1 flex-wrap">
          {datePresets.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p.id, p.getFrom)} className={cn(
              "h-8 rounded-full border px-3 text-[12px] font-semibold transition-colors",
              activeDatePreset === p.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            )}>
              {t(`datePreset.${p.id}`)}
            </button>
          ))}

          {/* Range picker */}
          <Popover open={rangePickerOpen} onOpenChange={setRangePickerOpen}>
            <PopoverTrigger asChild>
              <button className={cn("inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                dateFrom && !activeDatePreset ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
              )}>
                <CalendarIcon className="h-3 w-3" />
                {dateFrom && !activeDatePreset
                  ? `${format(dateFrom, "dd/MM/yy", { locale: df })}${dateTo ? ` – ${format(dateTo, "dd/MM/yy", { locale: df })}` : t("orders.rangeEllipsis")}`
                  : t("orders.customRange")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setRangeMonth(new Date(rangeMonth.getFullYear(), rangeMonth.getMonth() - 1, 1))}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-layer-01)] text-[var(--color-text-secondary)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <Select
                    value={`${rangeMonth.getFullYear()}-${rangeMonth.getMonth()}`}
                    onValueChange={(v) => {
                      const [y, m] = v.split("-").map(Number);
                      setRangeMonth(new Date(y, m, 1));
                    }}
                  >
                    <SelectTrigger className="w-[160px] h-7 border-none shadow-none text-[12px] font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[240px]">
                      {Array.from({ length: 60 }, (_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - i);
                        return (
                          <SelectItem key={i} value={`${d.getFullYear()}-${d.getMonth()}`}>
                            {format(d, "MMMM yyyy", { locale: df })}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => setRangeMonth(new Date(rangeMonth.getFullYear(), rangeMonth.getMonth() + 1, 1))}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-[var(--color-bg-layer-01)] text-[var(--color-text-secondary)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <Calendar
                  mode="range"
                  selected={dateFrom ? { from: dateFrom, to: dateTo } : undefined}
                  onSelect={(range) => {
                    setDateFrom(range?.from ?? undefined);
                    setDateTo(range?.to ?? undefined);
                    setActiveDatePreset(null);
                    if (range?.from && range?.to) {
                      setRangePickerOpen(false);
                    }
                  }}
                  month={rangeMonth}
                  onMonthChange={setRangeMonth}
                  className="p-0 pointer-events-auto"
                  numberOfMonths={1}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear filters */}
          {hasActiveFilters && (
            <>
              {/* separator removed */}
              <button
                onClick={clearAllFilters}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-[var(--color-border-subtle)] px-3 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-error)] hover:text-[var(--color-error)] transition-colors"
              >
                <X className="h-3 w-3" />
                {t("orders.clearFilters")}
              </button>
            </>
          )}
        </div>

        {searchQuery && (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--color-rexel-primary-10)] px-3 text-[12px] font-semibold text-[var(--color-primary)]">
              {t("orders.searchChip")}: &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery("")}><X className="h-3 w-3" /></button>
            </span>
          </div>
        )}
      </div>

      {/* ===== TABLE VIEW ===== */}
      {viewMode === "table" && filtered.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] shadow-[var(--shadow-1)]">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[140px]" />
                <col className="w-[120px]" />
                <col className="w-[160px]" />
                <col className="w-[140px]" />
                <col className="w-[100px]" />
                <col className="w-[160px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-01)]">
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {t("orders.colOrder")}
                  </th>
                  <SortableHeader colKey="order_date" label={t("orders.colDate")} />
                  <SortableHeader colKey="status" label={t("orders.colStatus")} />
                  <SortableHeader colKey="expected_delivery" label={t("orders.colExpDelivery")} />
                  <SortableHeader colKey="items_remaining" label={t("orders.colRemaining")} />
                  <th className="px-4 py-3 text-left text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    {t("orders.colPreview")}
                  </th>
                  <SortableHeader colKey="total_amount" label={t("orders.colTotal")} align="right" />
                  <th className="px-4 py-3 w-[120px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {visibleRows.map((order) => {
                  const orderItems = lineItems.filter((li) => li.order_id === order.id);
                  const thumbs = orderItems.slice(0, 3);
                  const moreCount = orderItems.length - thumbs.length;
                  return (
                  <tr
                    key={order.id}
                    className={cn(
                      "group transition-colors cursor-pointer",
                      sidePanelOrder === order.order_number
                        ? "bg-[var(--color-rexel-primary-10)]"
                        : "hover:bg-[var(--color-bg-layer-01)]"
                    )}
                    onClick={() => setSidePanelOrder(order.order_number)}
                  >
                    <td className="px-4 py-3 text-[12px] font-semibold text-[var(--color-text-primary)]">{order.order_number}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--color-text-secondary)]">{formatDate(order.order_date, "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-[var(--color-primary)]">{formatDate(order.expected_delivery, "dd/MM/yyyy")}</td>
                    <td className="px-4 py-3 text-[12px] text-[var(--color-text-secondary)]">{order.items_remaining}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {thumbs.map((li) => (
                          <div
                            key={li.id}
                            className="h-8 w-8 shrink-0 rounded-[var(--border-radius-sm)] bg-[#F6F8FB] border border-[#E0E4EB] flex items-center justify-center"
                            title={li.product_name}
                          >
                            <Package className="h-3.5 w-3.5 text-[#a8a8a8]" />
                          </div>
                        ))}
                        {moreCount > 0 && (
                          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">+{moreCount}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-right font-heading font-semibold text-[var(--color-text-primary)]">{formatCurrency(order.total_amount)}</td>
                    <td className="pl-2 pr-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleJoblist(order.id)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                          title={joblistIds.has(order.id) ? "Retirer de la joblist" : "Ajouter à la joblist"}
                          aria-label={joblistIds.has(order.id) ? "Retirer de la joblist" : "Ajouter à la joblist"}
                        >
                          <Star className={cn("h-3.5 w-3.5", joblistIds.has(order.id) && "fill-[var(--color-primary)]")} />
                        </button>
                        <button
                          onClick={() => handleReorderAll(order)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--border-radius-sm)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                          title={t("orders.reorderAllTitle")}
                          aria-label={t("orders.reorderAllTitle")}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Lazy-load sentinel + counter */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[12px] text-[var(--color-text-secondary)]">
              {t("orders.showing")} {visibleRows.length} {t("orders.of")} {tableSorted.length}
            </span>
            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => Math.min(c + LAZY_PAGE_SIZE, tableSorted.length))}
                className="inline-flex h-8 items-center gap-1 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] px-3 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
              >
                {t("orders.loadMore") ?? "Load more"}
              </button>
            )}
          </div>
          {hasMore && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
              <span className="ml-2 text-[12px] text-[var(--color-text-secondary)]">{t("orders.loadMore") ?? "Load more"}…</span>
            </div>
          )}
        </div>
      )}

      {/* ===== KANBAN VIEW ===== */}
      {viewMode === "kanban" && filtered.length > 0 && (
        <>
          {/* Project switcher: title + prev/next */}
          {projects.length > 0 && (() => {
            const currentIdx = Math.max(0, projects.indexOf(projectFilter));
            const goPrev = () => setProjectFilter(projects[(currentIdx - 1 + projects.length) % projects.length]);
            const goNext = () => setProjectFilter(projects[(currentIdx + 1) % projects.length]);
            return (
              <div className="mb-6 flex items-center justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-4">
                <h2 className="truncate text-[20px] font-bold text-[var(--color-text-primary)]">
                  {projectFilter}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] text-[var(--color-text-secondary)]">
                    {currentIdx + 1} / {projects.length}
                  </span>
                  <button
                    onClick={goPrev}
                    disabled={projects.length < 2}
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-layer-01)] disabled:opacity-40"
                    aria-label="Previous project"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={goNext}
                    disabled={projects.length < 2}
                    className="flex h-10 w-10 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-layer-01)] disabled:opacity-40"
                    aria-label="Next project"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 gap-4 pb-4 lg:grid-cols-3">
          {statusGroups
            .filter((group) => statusFilters.size === 0 || group.statuses.some((s) => statusFilters.has(s)))
            .map((group) => {
              const colOrders = filtered.filter((o) => group.statuses.includes(o.status));
              const Icon = group.icon;
              return (
                <div
                  key={group.key}
                  className="flex min-h-0 flex-col overflow-hidden rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-01)]"
                >
                  <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
                    <div
                      className={cn(
                        "sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] px-3 py-2 shadow-sm",
                        group.bgClass
                      )}
                    >
                      <div className={cn("flex items-center gap-1.5 text-[14px] font-semibold", group.colorClass)}>
                        <Icon className="h-4 w-4" />
                        {group.label}
                      </div>
                                <span className={cn("inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-2 text-[14px] font-semibold", group.colorClass)}>
                        {colOrders.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 p-2">
                      {colOrders.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-[12px] text-[var(--color-text-secondary)]">—</div>
                      ) : (
                        colOrders.map((order) => (
                          <div
                            key={order.id}
                            onClick={() => setSidePanelOrder(order.order_number)}
                            className={cn(
                              "cursor-pointer rounded-[var(--border-radius-sm)] border bg-white p-3 transition-all hover:shadow-[var(--shadow-2)]",
                              sidePanelOrder === order.order_number ? "border-[var(--color-primary)]" : "border-[#E0E4EB]"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[12px] font-semibold text-[var(--color-text-primary)]">{order.order_number}</span>
                              {order.project_name && (
                                <span className="inline-flex h-5 items-center rounded-[4px] bg-[#F6F8FB] px-2 text-[12px] font-semibold text-[#525252] truncate max-w-[120px]">
                                  {order.project_name}
                                </span>
                              )}
                            </div>
                            <div className="text-[12px] text-[var(--color-text-secondary)] mb-2">
                              {formatDate(order.order_date, "dd/MM/yyyy")} · {formatCurrency(order.total_amount)}
                            </div>
                            {order.expected_delivery && (
                              <div className="flex items-center gap-1 text-[12px] font-semibold text-[var(--color-primary)] mb-2">
                                <Truck className="h-3 w-3" />
                                {formatDate(order.expected_delivery, "dd/MM/yyyy")}
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-border-subtle)]" onClick={(e) => e.stopPropagation()}>
                              <span className="text-[12px] text-[var(--color-text-secondary)]">
                                {order.items_remaining > 0 ? `${order.items_remaining} ${t("orders.itemsRemaining")}` : "—"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleJoblist(order.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                                  title={joblistIds.has(order.id) ? "Retirer de la joblist" : "Ajouter à la joblist"}
                                >
                                  <Star className={cn("h-4 w-4", joblistIds.has(order.id) && "fill-[var(--color-primary)]")} />
                                </button>
                                <button
                                  onClick={() => handleReorderAll(order)}
                                  className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
                                  title={t("orders.reorderAllTitle")}
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
        </>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-16 w-16 text-[var(--color-text-secondary)] mb-4" strokeWidth={1} />
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1">{t("orders.emptyFilteredTitle")}</h3>
          <p className="text-[12px] text-[var(--color-text-secondary)] mb-4 max-w-sm">{t("orders.emptyFilteredHint")}</p>
          <button
            onClick={clearAllFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] px-4 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
          >
            {t("orders.clearAllFilters")}
          </button>
        </div>
      )}

      <OrderSidePanel orderNumber={sidePanelOrder} onClose={() => setSidePanelOrder(null)} />
    </div>
  );
}
