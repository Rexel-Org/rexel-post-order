import { Settings, MapPin, ChevronRight, Phone, Mail, Star, Box, Lightbulb, Cable, Wrench } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import LastOrdersWidget from "@/components/LastOrdersWidget";
import { useOrders } from "@/hooks/useOrders";
import { useMemo } from "react";

function Stat({ count, label, intent }: { count: number; label: string; intent: "info" | "warning" | "neutral" | "success" }) {
  const intentMap: Record<string, string> = {
    info: "bg-[var(--color-alert-info-bg)] text-[var(--color-info)]",
    warning: "bg-[var(--color-alert-warning-bg)] text-[var(--color-alert-warning-text)]",
    neutral: "bg-[var(--color-bg-layer-01)] text-[var(--color-text-primary)]",
    success: "bg-[var(--color-alert-success-bg)] text-[var(--color-success)]",
  };
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[6px] px-4 py-3 ${intentMap[intent]}`}>
      <div className="flex items-center gap-3">
        <span className="text-[20px] font-[var(--font-weight-semibold)]">{count}</span>
        <span className="text-[14px]">{label}</span>
      </div>
    </div>
  );
}

export default function Homepage() {
  const { t } = useI18n();
  const { data: orders } = useOrders();

  const counts = useMemo(() => {
    const list = orders ?? [];
    const preparing = list.filter((o) => o.status === "being_prepared").length;
    const backorder = list.filter((o) => o.status === "backorder").length;
    const shipping = list.filter((o) => o.status === "in_transit" || o.status === "partially_delivered").length;
    return { preparing, backorder, shipping, pickup: 0 };
  }, [orders]);

  return (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      {/* Hero promo banner */}
      <section
        className="rounded-[8px] p-[var(--spacing-4)] text-white"
        style={{ background: "linear-gradient(135deg,#0F62FE 0%, #002D72 100%)" }}
      >
        <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] uppercase tracking-wide opacity-80">Du 7 avril au 5 juin 2026</p>
            <h1 className="font-[var(--font-heading)] text-[28px] font-[var(--font-weight-semibold)] leading-tight">
              Discover our new core range
            </h1>
            <p className="mt-1 max-w-xl text-[14px] opacity-90">
              Solutions for residential and tertiary close to you.
            </p>
          </div>
          <button className="inline-flex h-10 items-center rounded-[4px] bg-white px-4 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)] hover:opacity-90">
            J'en profite
          </button>
        </div>
      </section>

      {/* Account quick access */}
      <section className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)]">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-[var(--color-text-secondary)]">{t("home.welcome")}</p>
            <p className="mt-1 text-[16px] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
              (1056154) REXEL FRANCE DSI
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[var(--color-border-subtle)] bg-white px-3 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)] hover:bg-[var(--color-bg-layer-01)]">
              <MapPin className="h-4 w-4" /> {t("home.changeAddress")}
            </button>
            <button className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[var(--color-border-subtle)] bg-white px-3 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)] hover:bg-[var(--color-bg-layer-01)]">
              <Settings className="h-4 w-4" /> {t("home.mySettings")}
            </button>
          </div>
        </div>
      </section>

      {/* Two-column: order status + recent orders widget */}
      <div className="grid gap-[var(--spacing-3)] md:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)]">
          <Stat count={counts.preparing} label={t("home.preparing")} intent="info" />
          <Stat count={counts.backorder} label={t("home.backorder")} intent="warning" />
          <Stat count={counts.shipping} label={t("home.shipping")} intent="info" />
          <Stat count={counts.pickup} label={t("home.pickup")} intent="neutral" />
          <button className="mt-2 self-end inline-flex h-9 items-center rounded-[4px] bg-[var(--color-primary)] px-4 text-[14px] font-[var(--font-weight-semibold)] text-white hover:opacity-90">
            {t("home.viewAllDeliveryNotes")}
          </button>
        </section>

        {/* Recently viewed products mock */}
        <section className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)]">
          <h2 className="mb-2 font-[var(--font-heading)] text-[18px] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
            {t("home.recentlyViewed")}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[Box, Cable, Lightbulb].map((Icon, i) => (
              <div key={i} className="flex flex-col gap-1 rounded-[6px] border border-[var(--color-border-subtle)] p-3">
                <div className="flex h-20 items-center justify-center rounded-[4px] bg-[var(--color-bg-layer-01)]">
                  <Icon className="h-8 w-8 text-[var(--color-text-secondary)]" />
                </div>
                <p className="truncate text-[14px] font-[var(--font-weight-semibold)]">Ref BIZ710{i}1</p>
                <p className="text-[12px] text-[var(--color-text-secondary)]">From 0,70 € / pc</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Last orders WIDGET */}
      <LastOrdersWidget />

      {/* Shortcuts row */}
      <section className="grid grid-cols-2 gap-3 rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)] md:grid-cols-4">
        {[
          { icon: Box, label: "Catalogues" },
          { icon: Settings, label: "Configurators" },
          { icon: Wrench, label: "Easy lists" },
          { icon: Lightbulb, label: "Services" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center justify-center gap-2 rounded-[4px] py-3 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)] hover:bg-[var(--color-bg-layer-01)]"
          >
            <Icon className="h-5 w-5" /> {label}
          </button>
        ))}
      </section>

      {/* Specially for you (promo tiles) */}
      <section>
        <h2 className="mb-2 font-[var(--font-heading)] text-[18px] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
          {t("home.specialForYou")}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[8px] bg-[#002D72] p-5 text-white">
            <p className="text-[12px] uppercase opacity-80">Operation</p>
            <h3 className="mt-1 font-[var(--font-heading)] text-[24px] font-[var(--font-weight-semibold)]">
              Are you ready?
            </h3>
            <p className="mt-1 text-[14px] opacity-90">E-invoicing becomes mandatory in September 2026.</p>
            <button className="mt-3 inline-flex h-9 items-center rounded-[4px] bg-white px-3 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)]">
              Discover
            </button>
          </div>
          <div className="rounded-[8px] bg-[#0F62FE] p-5 text-white">
            <p className="text-[12px] uppercase opacity-80">Showroom Rexel</p>
            <h3 className="mt-1 font-[var(--font-heading)] text-[24px] font-[var(--font-weight-semibold)]">
              See products in AR
            </h3>
            <p className="mt-1 text-[14px] opacity-90">Through our digital showroom.</p>
            <button className="mt-3 inline-flex h-9 items-center rounded-[4px] bg-white px-3 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)]">
              Discover
            </button>
          </div>
        </div>
      </section>

      {/* Contacts row */}
      <section>
        <h2 className="mb-2 font-[var(--font-heading)] text-[18px] font-[var(--font-weight-semibold)] text-[var(--color-text-primary)]">
          {t("home.myContacts")}
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)]">
            <p className="text-[12px] uppercase tracking-wide text-[var(--color-text-secondary)]">{t("home.myRep")}</p>
            <div className="my-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-bg-layer-01)] text-[16px] font-[var(--font-weight-semibold)] text-[var(--color-primary)]">
                MP
              </div>
              <div>
                <p className="text-[14px] font-[var(--font-weight-semibold)]">MARIE-ANGE PAUZAT</p>
                <p className="flex items-center gap-1 text-[12px] text-[var(--color-text-secondary)]">
                  <Phone className="h-3 w-3" /> 01 49 94 98 99
                </p>
                <p className="flex items-center gap-1 text-[12px] text-[var(--color-text-secondary)]">
                  <Mail className="h-3 w-3" /> marie-ange.pauzat@rexel.fr
                </p>
              </div>
            </div>
            <button className="w-full rounded-[4px] bg-[var(--color-primary)] py-2 text-[14px] font-[var(--font-weight-semibold)] text-white hover:opacity-90">
              {t("home.requestAppointment")}
            </button>
          </div>

          <div className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)]">
            <div className="flex items-center justify-between">
              <p className="text-[12px] uppercase tracking-wide text-[var(--color-text-secondary)]">{t("home.myBranch")}</p>
              <span className="inline-flex items-center gap-1 text-[12px] font-[var(--font-weight-semibold)] text-[var(--color-success)]">
                ● {t("home.open")}
              </span>
            </div>
            <p className="mt-2 text-[14px] font-[var(--font-weight-semibold)]">REXEL — FONTENAY</p>
            <p className="text-[12px] text-[var(--color-text-secondary)]">
              174 av. Mar. de Lattre de Tassigny<br />94120 Fontenay-sous-Bois
            </p>
            <p className="mt-2 flex items-center gap-1 text-[12px] text-[var(--color-text-secondary)]">
              <Phone className="h-3 w-3" /> 01 43 94 02 02
            </p>
            <button className="mt-3 w-full rounded-[4px] border border-[var(--color-primary)] py-2 text-[14px] font-[var(--font-weight-semibold)] text-[var(--color-primary)] hover:bg-[var(--color-bg-layer-01)]">
              {t("home.viewDetails")}
            </button>
          </div>

          <div className="rounded-[8px] border border-[var(--color-border-subtle)] bg-white p-[var(--spacing-3)]">
            <p className="text-[12px] uppercase tracking-wide text-[var(--color-text-secondary)]">{t("home.feedbackTitle")}</p>
            <p className="mt-2 text-[14px]">{t("home.feedbackBody")}</p>
            <div className="mt-3 flex items-center gap-1 text-[var(--color-text-secondary)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-6 w-6" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
