import { useState } from "react";
import { documents } from "@/data/orders";
import { Button } from "@/components/Button";
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tabs = ["Factures", "Bons de livraison"] as const;

export default function Documents() {
  const [active, setActive] = useState<typeof tabs[number]>("Factures");

  const handleDownload = (name: string) => {
    toast.success(`Téléchargement de ${name} lancé`);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">Factures et bons de livraison</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => toast.success("Téléchargement groupé lancé")}>
          <Download className="h-4 w-4 mr-1" /> Tout
        </Button>
      </div>

      <div className="flex gap-1 mb-4 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
              active === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === "Factures" && (
        <div className="space-y-3">
          {documents.invoices.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                <FileText className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.date).toLocaleDateString("fr-FR")} —{" "}
                  <span className="font-heading font-semibold">{doc.amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
                </p>
              </div>
              <button onClick={() => handleDownload(doc.name)} className="shrink-0 text-primary">
                <Download className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {active === "Bons de livraison" && (
        <div className="space-y-3">
          {documents.deliverySlips.map((doc, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                <FileText className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(doc.date).toLocaleDateString("fr-FR")}</p>
              </div>
              <button onClick={() => handleDownload(doc.name)} className="shrink-0 text-primary">
                <Download className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
