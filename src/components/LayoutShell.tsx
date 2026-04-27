import { useLayoutEffect, useRef, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import ScenarioSwitcher from "./ScenarioSwitcher";
import RexelSiteHeader from "./RexelSiteHeader";
import { useI18n } from "@/i18n/useI18n";
import { ArrowUp } from "lucide-react";

const SITE_HEADER_HEIGHT_VAR = "--flow-sticky-site-header-height";

export default function LayoutShell() {
  const { t } = useI18n();
  const stickyRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useLayoutEffect(() => {
    const el = stickyRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const sync = () => {
      document.documentElement.style.setProperty(SITE_HEADER_HEIGHT_VAR, `${Math.round(el.offsetHeight)}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(SITE_HEADER_HEIGHT_VAR);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const vh = window.innerHeight || 800;
      // Show a bit earlier than "one full screen" scroll.
      const threshold = Math.max(240, Math.round(vh * 0.5));
      setShowScrollTop(window.scrollY > threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-page)]">
      <div ref={stickyRef} className="sticky top-0 z-40 shrink-0">
        <div
          className="border-b border-[#E0E4EB] bg-[#FAFBFC]"
          role="region"
          aria-label={t("proto.banner")}
        >
          <div className="mx-auto flex max-w-[1440px] flex-col items-stretch justify-end gap-[var(--spacing-2)] px-[var(--spacing-3)] py-[var(--spacing-2)] sm:flex-row sm:items-center sm:justify-end">
            <ScenarioSwitcher />
          </div>
        </div>
        <RexelSiteHeader />
      </div>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1440px] px-[var(--spacing-3)] py-[var(--spacing-3)]">
          <Outlet />
        </div>
      </main>

      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-5 right-5 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-[var(--shadow-3)] hover:bg-[var(--color-primary-hover)] transition-colors"
          aria-label={t("proto.scrollTop")}
          title={t("proto.scrollTop")}
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
