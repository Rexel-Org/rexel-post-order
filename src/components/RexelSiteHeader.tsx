import * as React from "react";
import { MaterialIcon } from "@/components/MaterialIcon";
import { useCartStore } from "@/stores/cartStore";
import { useI18n } from "@/i18n/useI18n";

const NAVY = "#002D72";

function UtilityLink({ icon, label, href = "#" }: { icon: string; label: string; href?: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-[2px] text-center font-[var(--font-body)] text-[12px] leading-[16px] text-white no-underline transition-opacity hover:opacity-90"
    >
      <MaterialIcon name={icon} size={22} className="text-white" />
      <span className="max-w-[72px] truncate">{label}</span>
    </a>
  );
}

function RexelHeaderBlueBar({ cartArticleCount, cartHref }: { cartArticleCount: number; cartHref: string }) {
  const { t } = useI18n();
  const showBadge = cartArticleCount > 0;
  const badgeText = cartArticleCount > 99 ? "99+" : String(cartArticleCount);

  return (
    <div className="w-full text-white" style={{ backgroundColor: NAVY }} role="banner">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-[var(--spacing-3)] px-[var(--spacing-3)] py-[var(--spacing-3)] lg:flex-row lg:items-center lg:gap-[var(--spacing-3)]">
        <div className="flex shrink-0 flex-wrap items-center gap-[8px]">
          <div className="flex h-[40px] items-center border-2 border-white bg-white px-[10px] font-[var(--font-body)] text-[14px] font-[var(--font-weight-bold)] tracking-[0.06em] text-[#003399]">
            REXEL
          </div>
          <div className="flex h-[40px] flex-col justify-center bg-[#198038] px-[10px] py-[4px] font-[var(--font-body)] leading-tight text-white">
            <span className="text-[14px] font-[var(--font-weight-bold)]">&amp;DIT</span>
            <span className="text-[12px] font-[var(--font-weight-semibold)] opacity-95 leading-[14px]">Technologies</span>
          </div>
        </div>

        <div className="min-w-0 w-full flex-1">
          <div className="flex h-[44px] w-full items-center gap-[8px] rounded-[8px] bg-white pl-[12px] pr-[6px]">
            <MaterialIcon name="search" size={20} className="shrink-0 text-[#8d8d8d]" />
            <input
              type="search"
              readOnly
              tabIndex={-1}
              placeholder={t("header.searchPlaceholder")}
              className="min-w-0 flex-1 border-0 bg-transparent font-[var(--font-body)] text-[14px] leading-[20px] text-[#161616] outline-none placeholder:text-[#a8a8a8]"
              aria-label={t("header.searchPlaceholder")}
            />
            <button
              type="button"
              className="flex shrink-0 items-center gap-[4px] rounded-[6px] px-[8px] py-[6px] font-[var(--font-body)] text-[12px] font-[var(--font-weight-semibold)] text-[#003399] transition-colors hover:bg-[#f4f6fb]"
            >
              <MaterialIcon name="tune" size={18} className="text-[#003399]" />
              <span className="hidden sm:inline">{t("header.searchSettings")}</span>
            </button>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-start justify-end gap-[16px] sm:gap-[20px] lg:items-center">
          <UtilityLink icon="business_center" label={t("header.yourBusiness")} />
          <UtilityLink icon="handyman" label={t("header.yourTools")} />
          <UtilityLink icon="print" label="taina.hake" />
          <a
            href={cartHref}
            className="relative flex flex-col items-center gap-[2px] text-center font-[var(--font-body)] text-[12px] leading-[16px] text-white no-underline transition-opacity hover:opacity-90"
          >
            <span className="relative inline-flex">
              <MaterialIcon name="shopping_cart" size={22} className="text-white" />
              {showBadge && (
                <span className="absolute -right-[6px] -top-[4px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff832b] px-[4px] font-[var(--font-body)] text-[12px] font-[var(--font-weight-bold)] leading-none text-white">
                  {badgeText}
                </span>
              )}
            </span>
            <span>{t("header.cart")}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function RexelHeaderMainNav() {
  const { t } = useI18n();
  return (
    <nav
      className="w-full bg-white font-[var(--font-body)] text-[14px] font-[var(--font-weight-semibold)] shadow-[0_2px_12px_rgba(0,20,50,0.08)]"
      style={{ color: NAVY }}
      aria-label={t("header.mainNavAria")}
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-[var(--spacing-3)] gap-y-[var(--spacing-2)] px-[var(--spacing-3)] py-[12px]">
        <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
          <button
            type="button"
            className="inline-flex items-center gap-[8px] border-0 bg-transparent p-0 font-[var(--font-body)] text-[14px] font-[var(--font-weight-semibold)] text-inherit hover:underline"
            style={{ color: NAVY }}
          >
            <MaterialIcon name="manage_search" size={22} style={{ color: NAVY }} />
            {t("header.navCategories")}
          </button>
          <a href="#" className="no-underline hover:underline" style={{ color: NAVY }}>
            {t("header.navServices")}
          </a>
          <a href="#" className="no-underline hover:underline" style={{ color: NAVY }}>
            {t("header.navExpertises")}
          </a>
          <a href="#" className="no-underline hover:underline" style={{ color: NAVY }}>
            {t("header.navLafabrique")}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
          <a href="#" className="inline-flex items-center gap-[6px] no-underline hover:underline" style={{ color: NAVY }}>
            <MaterialIcon name="description" size={20} style={{ color: NAVY }} />
            {t("header.navNew")}
          </a>
          <a href="#" className="inline-flex items-center gap-[6px] no-underline hover:underline" style={{ color: NAVY }}>
            <MaterialIcon name="sell" size={20} style={{ color: NAVY }} />
            {t("header.navPromos")}
          </a>
          <a href="#" className="inline-flex items-center gap-[6px] no-underline hover:underline" style={{ color: NAVY }}>
            <MaterialIcon name="price_check" size={20} style={{ color: NAVY }} />
            {t("header.navDestock")}
          </a>
        </div>
      </div>
    </nav>
  );
}

export default function RexelSiteHeader() {
  const cartArticleCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
  const cartHref =
    (import.meta.env.VITE_CART_CHECKOUT_URL as string | undefined)?.trim() || "http://localhost:8080/";

  return (
    <div className="shrink-0 bg-white shadow-[0_2px_12px_rgba(0,20,50,0.08)]">
      <RexelHeaderBlueBar cartArticleCount={cartArticleCount} cartHref={cartHref} />
      <RexelHeaderMainNav />
    </div>
  );
}
