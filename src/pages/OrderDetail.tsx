import { useParams, useNavigate } from "react-router-dom";
import { orders } from "@/data/orders";
import { Button } from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Package, Truck, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Passée", icon: ClipboardCheck },
  { label: "Confirmée", icon: Check },
  { label: "En transit", icon: Truck },
  { label: "Livrée", icon: Package },
];

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = orders.find((o) => o.id === id);

  if (!order) return <div className="p-4">Commande introuvable</div>;

  return (
    <div className="p-4">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground">{order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">{order.supplier} — {new Date(order.date).toLocaleDateString("fr-FR")}</p>
      </div>

      {/* Delivery tracker */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Suivi livraison</p>
        <div className="flex items-center justify-between">
          {steps.map((step, i) => {
            const done = i <= order.deliveryStep;
            const current = i === order.deliveryStep;
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  current && "ring-2 ring-primary ring-offset-2 ring-offset-card"
                )}>
                  <step.icon className="h-4 w-4" />
                </div>
                <span className={cn("text-[length:var(--font-size-xs)] text-center leading-tight", done ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Connector lines */}
        <div className="mt-[var(--spacing-neg-30)] mb-6 flex px-[var(--spacing-2-25)]">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn("h-0.5 flex-1 mx-1", i < order.deliveryStep ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Livraison prévue : <span className="font-medium text-foreground">{order.expectedDelivery !== "—" ? new Date(order.expectedDelivery).toLocaleDateString("fr-FR") : "—"}</span>
        </p>
      </div>

      {/* Items */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Articles commandés</p>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-card-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">Réf: {item.reference} — Qté: {item.quantity}</p>
              </div>
              <p className="shrink-0 font-heading font-semibold text-card-foreground">{(item.quantity * item.unitPrice).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-border pt-3 flex justify-between font-semibold text-sm">
          <span>Total</span>
          <span className="font-heading font-semibold">{order.totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</span>
        </div>
      </div>

      <Button className="w-full" onClick={() => navigate(`/documents?order=${order.id}`)}>
        Voir les documents
      </Button>
    </div>
  );
}
