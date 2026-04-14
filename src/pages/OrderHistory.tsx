import { useState, useMemo, useEffect } from "react";
import {
  Search, X, AlertTriangle, XCircle, CheckCircle, Package,
  Truck, Copy, Download, CalendarIcon, LayoutGrid, List,
  ArrowUpDown, ArrowUp, ArrowDown, ShoppingCart,
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

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const meta = statusVisual[status] ?? statusVisual.on_track;
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
const ONGOING_STATUSES = ["on_track", "being_prepared", "in_transit", "partially_delivered", "delayed"];
const NEEDS_ATTENTION_STATUSES = ["delayed", "cancelled"];

function isOngoing(s: string) { return ONGOING_STATUSES.includes(s); }
function isCompleted(s: string) { return s === "completed"; }
function needsAttention(s: string) { return NEEDS_ATTENTION_STATUSES.includes(s); }

// --- Order Card (list view) ---
function OrderCard({
  order, lineItems, onClick, warning, onReorder,
}: {
  order: OrderRow; lineItems: LineItemRow[]; onClick: () => void; warning?: boolean; onReorder?: () => void;
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
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252] mb-[var(--spacing-2)]">
        <span>{formatDate(order.order_date, "dd/MM/yyyy")}</span>
        <span className="text-[#E0E4EB]">|</span>
        <span className="font-[var(--font-weight-semibold)] text-[#161616]">{formatCurrency(order.total_amount)}</span>
        {order.expected_delivery && (
          <>
            <span className="text-[#E0E4EB]">|</span>
            <span className="font-[var(--font-weight-semibold)] text-[#003399]">
              <Truck className="inline h-3 w-3 mr-0.5" />
              {t("orders.expLabel")} {formatDate(order.expected_delivery, "dd/MM/yyyy")}
            </span>
          </>
        )}
        {order.items_remaining > 0 && (
          <>
            <span className="text-[#E0E4EB]">|</span>
            <span>
              {order.items_remaining} {t("orders.itemsRemaining")}
            </span>
          </>
        )}
      </div>

      {order.project_name && (
        <div className="mb-[var(--spacing-2)]">
          <span className="inline-flex h-[28px] items-center gap-1 rounded-[4px] bg-[#F6F8FB] px-[8px] font-[var(--font-body)] text-[12px] leading-[16px] font-[var(--font-weight-semibold)] text-[#525252]">
            {order.project_name}
          </span>
        </div>
      )}

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
        {onReorder && (
          <button
            onClick={(e) => { e.stopPropagation(); onReorder(); }}
            className="inline-flex h-[32px] w-[32px] items-center justify-center rounded-[var(--border-radius-sm)] border border-[#003399] bg-white text-[#003399] hover:bg-[#EEF2FF] transition-colors"
            title={t("orders.reorderAllTitle")}
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        )}
      </div>

      {order.status === "delayed" && order.previous_expected_delivery && (
        <div className="mt-[var(--spacing-2)] flex items-center gap-[8px] rounded-[var(--border-radius-sm)] border border-[var(--color-alert-error-border)] bg-[var(--color-alert-error-bg)] px-[var(--spacing-2)] py-[var(--spacing-1)] font-[var(--font-body)] text-[12px] leading-[16px] text-[var(--color-alert-error-text)]">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>
            {t("orders.newDeliveryDate")}: {formatDate(order.expected_delivery, "dd/MM/yyyy")} {t("orders.insteadOf")}{" "}
            <span className="line-through">{formatDate(order.previous_expected_delivery, "dd/MM/yyyy")}</span>
            {" — "}
            {t("orders.delayedByCarrier")}
          </span>
        </div>
      )}

      {order.status === "partially_delivered" && (
        <div className="mt-[var(--spacing-2)] font-[var(--font-body)] text-[12px] leading-[16px] text-[#525252]">
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

  const [activeTab, setActiveTab] = useState<"ongoing" | "backorders" | "completed">("ongoing");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDatePreset, setActiveDatePreset] = useState<DatePresetId | null>("3m");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 3));
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "table">("list");

  // Table state
  const [sortKey, setSortKey] = useState<SortKey>("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sidePanelOrder, setSidePanelOrder] = useState<string | null>(null);
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

  const ongoingCount = orders.filter((o) => isOngoing(o.status)).length;
  const backorderCount = orders.filter((o) => o.items_remaining > 0 && o.status !== "completed").length;
  const completedCount = orders.filter((o) => isCompleted(o.status)).length;

  // Filtering
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return orders
      .filter((o) => {
        if (activeTab === "ongoing") return isOngoing(o.status);
        if (activeTab === "completed") return isCompleted(o.status);
        if (activeTab === "backorders") return o.items_remaining > 0 && o.status !== "completed";
        return true;
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
  }, [orders, lineItems, activeTab, searchQuery, dateFrom, dateTo, projectFilter]);

  // Table sorted data
  const tableSorted = useMemo(() => {
    const statusOrder: Record<string, number> = { delayed: 0, cancelled: 1, partially_delivered: 2, in_transit: 3, being_prepared: 4, on_track: 5, completed: 6 };
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

  // Pagination
  const totalPages = Math.ceil(tableSorted.length / ROWS_PER_PAGE);
  const paginatedRows = tableSorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Split for list view
  const needsAttentionOrders = activeTab === "ongoing" ? filtered.filter((o) => needsAttention(o.status)) : [];
  const ongoingOrders = activeTab === "ongoing" ? filtered.filter((o) => !needsAttention(o.status)) : filtered;

  useEffect(() => { setVisibleCount(10); setCurrentPage(1); }, [activeTab, searchQuery, dateFrom, dateTo, projectFilter]);

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

  const tabs = [
    { key: "ongoing" as const, label: `${t("orders.tabOngoing")} (${ongoingCount})` },
    { key: "backorders" as const, label: `${t("orders.tabBackorders")} (${backorderCount})` },
    { key: "completed" as const, label: `${t("orders.tabCompleted")} (${completedCount})` },
  ];

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-[var(--font-heading)] text-[var(--font-size-xl)] font-bold leading-[var(--line-height-xl)] text-[var(--color-text-primary)]">
          {t("orders.title")}
        </h1>
        <p className="mt-1 font-[var(--font-body)] text-[12px] leading-[16px] text-[var(--color-text-secondary)]">
          {t("orders.subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--color-border-subtle)]">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn(
            "px-4 py-2.5 text-[13px] font-semibold transition-colors border-b-2 -mb-px",
            activeTab === tab.key ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar — sticky */}
      <div className="sticky top-[var(--flow-sticky-site-header-height,140px)] z-30 mt-[var(--spacing-3)] space-y-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] pb-[var(--spacing-4)] pt-[var(--spacing-3)] mb-[var(--spacing-4)]">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-placeholder)]" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("orders.searchPlaceholder")}
              className="h-10 w-full rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] pl-9 pr-9 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[220px] h-10 border-[var(--color-border-subtle)] text-[13px]">
              <SelectValue placeholder={t("orders.allProjects")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("orders.allProjects")}</SelectItem>
              {projects.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
            </SelectContent>
          </Select>

          <button onClick={() => exportCSV()} className="inline-flex h-10 items-center gap-1.5 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] px-4 text-[13px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors">
            <Download className="h-4 w-4" />
            {t("orders.exportCsv")}
          </button>

          {/* View toggle */}
          <div className="flex items-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn("flex h-10 w-10 items-center justify-center transition-colors",
                viewMode === "list" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-bg-layer-02)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title={t("orders.cardView")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn("flex h-10 w-10 items-center justify-center transition-colors",
                viewMode === "table" ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-bg-layer-02)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              )}
              title={t("orders.tableView")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Date chips + range picker */}
        <div className="flex items-center gap-1.5 flex-wrap">
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
          <div className="h-4 w-px bg-[var(--color-border-subtle)] mx-1" />

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
              <div className="h-4 w-px bg-[var(--color-border-subtle)] mx-1" />
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
      {viewMode === "table" && (
        <div className="space-y-6">

          {/* Needs Attention table section */}
          {(() => {
            const attentionRows = activeTab === "ongoing" ? tableSorted.filter((o) => needsAttention(o.status)) : [];
            const regularRows = activeTab === "ongoing" ? tableSorted.filter((o) => !needsAttention(o.status)) : tableSorted;
            const attentionPaginated = attentionRows; // show all attention rows (usually few)

            const renderTableBlock = (rows: typeof tableSorted, title?: string, isAttention?: boolean, paginate?: boolean) => {
              if (rows.length === 0) return null;
              const displayRows = paginate ? rows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE) : rows;
              const pageCount = paginate ? Math.ceil(rows.length / ROWS_PER_PAGE) : 0;

              return (
                <div className="space-y-3">
                  {title && (
              <div className="flex items-center gap-2">
                      {isAttention && <AlertTriangle className="h-4 w-4 text-[var(--color-text-primary)]" />}
                      <h2 className="headline-l text-[#161616]">
                        {title} ({rows.length})
                      </h2>
                    </div>
                  )}
                  <div className="overflow-hidden rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] shadow-[var(--shadow-1)]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-01)]">
                          <SortableHeader colKey="order_number" label={t("orders.colOrder")} />
                          <SortableHeader colKey="po_number" label={t("orders.colPO")} />
                          <SortableHeader colKey="order_date" label={t("orders.colDate")} />
                          <SortableHeader colKey="status" label={t("orders.colStatus")} />
                          <SortableHeader colKey="total_amount" label={t("orders.colTotal")} align="right" />
                          <SortableHeader colKey="expected_delivery" label={t("orders.colExpDelivery")} />
                          <SortableHeader colKey="items_remaining" label={t("orders.colRemaining")} />
                          <th className="px-4 py-3 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border-subtle)]">
                        {displayRows.map((order) => (
                          <tr
                            key={order.id}
                            className={cn(
                              "group transition-colors cursor-pointer",
                              sidePanelOrder === order.order_number
                                ? "bg-[var(--color-rexel-primary-10)] border-l-2 border-l-[var(--color-primary)]"
                                : "hover:bg-[var(--color-bg-layer-01)]"
                            )}
                            onClick={() => setSidePanelOrder(order.order_number)}
                          >
                            <td className="px-4 py-3 text-[13px] font-semibold text-[var(--color-text-primary)]">{order.order_number}</td>
                            <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">{order.po_number ?? "—"}</td>
                            <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">{formatDate(order.order_date, "dd/MM/yyyy")}</td>
                            <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                            <td className="px-4 py-3 text-[13px] text-right font-semibold text-[var(--color-text-primary)]">{formatCurrency(order.total_amount)}</td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-[var(--color-primary)]">{formatDate(order.expected_delivery, "dd/MM/yyyy")}</td>
                            <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">{order.items_remaining}</td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleReorderAll(order)}
                                className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                                title={t("orders.reorderAllTitle")}
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for ongoing section */}
                  {pageCount > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[12px] text-[var(--color-text-secondary)]">
                        {t("orders.showing")} {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, rows.length)} {t("orders.of")} {rows.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
                          <button key={page} onClick={() => setCurrentPage(page)}
                            className={cn("flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] text-[12px] font-semibold transition-colors",
                              page === currentPage ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)]"
                            )}>
                            {page}
                          </button>
                        ))}
                        <button onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount}
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            if (activeTab === "ongoing") {
              return (
                <>
                  {renderTableBlock(attentionPaginated, t("orders.needsAttention"), true, false)}
                  {renderTableBlock(regularRows, t("orders.ongoing"), false, true)}
                </>
              );
            }
            // For other tabs, single table with pagination
            const displayRows = tableSorted.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
            return (
              <>
                <div className="overflow-hidden rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] shadow-[var(--shadow-1)]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-01)]">
                        <SortableHeader colKey="order_number" label={t("orders.colOrder")} />
                        <SortableHeader colKey="po_number" label={t("orders.colPO")} />
                        <SortableHeader colKey="order_date" label={t("orders.colDate")} />
                        <SortableHeader colKey="status" label={t("orders.colStatus")} />
                        <SortableHeader colKey="total_amount" label={t("orders.colTotal")} align="right" />
                        <SortableHeader colKey="expected_delivery" label={t("orders.colExpDelivery")} />
                        <SortableHeader colKey="items_remaining" label={t("orders.colRemaining")} />
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                      {displayRows.map((order) => (
                        <tr key={order.id}
                          className={cn("group transition-colors cursor-pointer",
                            sidePanelOrder === order.order_number ? "bg-[var(--color-rexel-primary-10)] border-l-2 border-l-[var(--color-primary)]"
                              : "hover:bg-[var(--color-bg-layer-01)]"
                          )}
                          onClick={() => setSidePanelOrder(order.order_number)}
                        >
                          <td className="px-4 py-3 text-[13px] font-semibold text-[var(--color-text-primary)]">{order.order_number}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">{order.po_number ?? "—"}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">{formatDate(order.order_date, "dd/MM/yyyy")}</td>
                          <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                          <td className="px-4 py-3 text-[13px] text-right font-semibold text-[var(--color-text-primary)]">{formatCurrency(order.total_amount)}</td>
                          <td className="px-4 py-3 text-[13px] font-semibold text-[var(--color-primary)]">{formatDate(order.expected_delivery, "dd/MM/yyyy")}</td>
                          <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">{order.items_remaining}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleReorderAll(order)}
                              className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-rexel-primary-10)] transition-colors"
                              title={t("orders.reorderAllTitle")}>
                              <ShoppingCart className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                      {t("orders.showing")} {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, tableSorted.length)} {t("orders.of")} {tableSorted.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button key={page} onClick={() => setCurrentPage(page)}
                          className={cn("flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] text-[12px] font-semibold transition-colors",
                            page === currentPage ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)]"
                          )}>
                          {page}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-01)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ===== LIST VIEW ===== */}
      {viewMode === "list" && (
        <>
          {/* Needs Attention section */}
          {needsAttentionOrders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[var(--color-text-primary)]" />
                <h2 className="headline-l text-[#161616]">
                  {t("orders.needsAttention")} ({needsAttentionOrders.length})
                </h2>
              </div>
              <div className="grid gap-3 grid-cols-1">
                {needsAttentionOrders.map((o) => (
                  <OrderCard key={o.id} order={o} lineItems={lineItems} onClick={() => setSidePanelOrder(o.order_number)} warning onReorder={() => handleReorderAll(o)} />
                ))}
              </div>
            </div>
          )}

          {/* Separator between sections */}
          {needsAttentionOrders.length > 0 && ongoingOrders.length > 0 && activeTab === "ongoing" && (
            <div className="border-t border-[var(--color-border-subtle)]" />
          )}

          {activeTab === "ongoing" && ongoingOrders.length > 0 && (
            <div className="space-y-3">
              <h2 className="headline-l text-[#161616]">
                {t("orders.ongoing")} ({ongoingOrders.length})
              </h2>
              <div className="grid gap-3 grid-cols-1">
                {ongoingOrders.slice(0, visibleCount).map((o) => (
                  <OrderCard key={o.id} order={o} lineItems={lineItems} onClick={() => setSidePanelOrder(o.order_number)} onReorder={() => handleReorderAll(o)} />
                ))}
              </div>
            </div>
          )}

          {activeTab !== "ongoing" && ongoingOrders.length > 0 && (
            <div className="grid gap-3 grid-cols-1">
              {ongoingOrders.slice(0, visibleCount).map((o) => (
                <OrderCard key={o.id} order={o} lineItems={lineItems} onClick={() => setSidePanelOrder(o.order_number)} onReorder={() => handleReorderAll(o)} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-16 w-16 text-[var(--color-text-secondary)] mb-4" strokeWidth={1} />
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1">
                {hasActiveFilters ? t("orders.emptyFilteredTitle") : t("orders.emptyNoOrdersTitle")}
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-4 max-w-sm">
                {hasActiveFilters ? t("orders.emptyFilteredHint") : t("orders.emptyNoOrdersHint")}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] px-4 text-[13px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
                >
                  {t("orders.clearAllFilters")}
                </button>
              )}
            </div>
          )}

          {/* Load more */}
          {(activeTab === "ongoing" ? ongoingOrders : filtered).length > visibleCount && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((v) => v + 10)}
                className="inline-flex h-10 items-center gap-1.5 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] px-6 text-[13px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
              >
                {t("orders.loadMore")} ({(activeTab === "ongoing" ? ongoingOrders : filtered).length - visibleCount} {t("orders.remaining")})
              </button>
            </div>
          )}
        </>
      )}

      {/* Table empty state */}
      {viewMode === "table" && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="h-16 w-16 text-[var(--color-text-secondary)] mb-4" strokeWidth={1} />
          <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-1">{t("orders.emptyFilteredTitle")}</h3>
          <p className="text-[13px] text-[var(--color-text-secondary)] mb-4 max-w-sm">{t("orders.emptyFilteredHint")}</p>
          <button
            onClick={clearAllFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-[var(--border-radius-sm)] border border-[var(--color-border-subtle)] px-4 text-[13px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-layer-01)] transition-colors"
          >
            {t("orders.clearAllFilters")}
          </button>
        </div>
      )}

      <OrderSidePanel orderNumber={sidePanelOrder} onClose={() => setSidePanelOrder(null)} />
    </div>
  );
}
