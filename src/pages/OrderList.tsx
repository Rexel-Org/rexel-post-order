import { useNavigate } from "react-router-dom";
import { orders } from "@/data/orders";
import { Badge, type BadgeType } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ChevronRight } from "lucide-react";

const statusConfig: Record<string, { label: string; type: BadgeType }> = {
  confirmed: { label: "Confirmee", type: "alreadyBought" },
  
  cancelled: { label: "Annulee", type: "offer" },
  delivered: { label: "Livree", type: "habituallyInStock" },
};

export default function OrderList() {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <h1 className="mb-1 text-xl font-bold text-foreground">Commandes</h1>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">Suivi des commandes matériaux</p>

      <div className="space-y-3">
        {orders.map((order) => {
          const cfg = statusConfig[order.status];
          return (
            <Button
              key={order.id}
              onClick={() => navigate(`/order/${order.id}`)}
              variant="ghost"
              className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-layer-02)] p-4 text-left shadow-[var(--shadow-1)] hover:bg-[var(--color-bg-layer-01)]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-[var(--color-text-primary)]">{order.orderNumber}</span>
                  <Badge type={cfg.type} label={cfg.label} className="min-h-8 px-3 py-0 text-[length:var(--font-size-xs)]" />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">{order.supplier}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{new Date(order.date).toLocaleDateString("fr-FR")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-heading font-semibold text-sm text-[var(--color-text-primary)]">{order.totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)] shrink-0" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
