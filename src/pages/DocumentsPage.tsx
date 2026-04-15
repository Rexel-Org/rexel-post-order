import { useParams, useNavigate } from "react-router-dom";
import { documents } from "@/data/demoOrders";
import { Button } from "@/components/Button";
import { ArrowLeft, Download, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";

const tabs = ["Factures", "Bons de livraison"] as const;

export default function DocumentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [active, setActive] = useState<typeof tabs[number]>("Factures");

  const invoices = id ? documents.invoices.filter((d) => d.orderId === id) : documents.invoices;
  const slips = id ? documents.deliverySlips.filter((d) => d.orderId === id) : documents.deliverySlips;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl py-8">
        <Button variant="link" size="sm" className="mb-6 px-0 text-[var(--color-text-secondary)]" onClick={() => navigate("/orders")}>
          <ArrowLeft className="h-4 w-4" /> Retour aux commandes
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Factures et bons de livraison</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => toast.success("Téléchargement groupé lancé")}>
            <Download className="h-4 w-4 mr-1" /> Tout télécharger
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-lg bg-[var(--color-bg-layer-01)] p-1">
          {tabs.map((tab) => (
            <Button
              key={tab}
              onClick={() => setActive(tab)}
              className={cn(
                "flex-1 rounded-md py-2 text-sm",
                active === tab
                  ? "bg-[var(--color-bg-layer-02)] text-[var(--color-text-primary)] shadow-[var(--shadow-1)]"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-layer-02)]"
              )}
              variant="ghost"
            >
              {tab}
            </Button>
          ))}
        </div>

        {/* Content */}
        {active === "Factures" && (
          <div className="space-y-3">
            {invoices.length === 0 && <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">Aucune facture disponible.</p>}
            {invoices.map((doc, i) => (
              <div key={i} className="flex items-center gap-4 rounded-sm border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] p-4 shadow-[var(--shadow-1)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-alert-info-bg)]">
                  <FileText className="h-5 w-5 text-[var(--color-info)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{doc.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {new Date(doc.date).toLocaleDateString("fr-FR")} —{" "}
                    <span className="font-heading font-semibold">
                      {doc.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
                    </span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toast.success(`Téléchargement de ${doc.name}`)}
                  className="shrink-0 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {active === "Bons de livraison" && (
          <div className="space-y-3">
            {slips.length === 0 && <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">Aucun bon de livraison disponible.</p>}
            {slips.map((doc, i) => (
              <div key={i} className="flex items-center gap-4 rounded-sm border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] p-4 shadow-[var(--shadow-1)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-alert-info-bg)]">
                  <FileText className="h-5 w-5 text-[var(--color-info)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{doc.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{new Date(doc.date).toLocaleDateString("fr-FR")}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toast.success(`Téléchargement de ${doc.name}`)}
                  className="shrink-0 text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                >
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
