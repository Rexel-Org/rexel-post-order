import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { storefrontApiRequest, STOREFRONT_QUERY, type ShopifyProduct } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/Button";
import { ShoppingCart, Loader2, Package } from "lucide-react";
import { toast } from "sonner";

export default function ProductGrid() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const isCartLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    storefrontApiRequest(STOREFRONT_QUERY, { first: 20 })
      .then((data) => {
        setProducts(data?.data?.products?.edges ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (product: ShopifyProduct) => {
    const variant = product.node.variants.edges[0]?.node;
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success("Ajouté au panier", { description: product.node.title });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container py-16">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Nos produits</h2>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Aucun produit disponible</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Le catalogue est en cours de mise en place. Créez votre premier produit en indiquant son nom et son prix dans le chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h2 className="font-display text-2xl font-bold text-foreground mb-6">Nos produits</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map((product) => {
          const img = product.node.images.edges[0]?.node;
          const price = product.node.priceRange.minVariantPrice;
          return (
            <div key={product.node.id} className="group rounded-sm border border-border bg-card overflow-hidden transition-shadow hover:shadow-elevation-2">
              <Link to={`/product/${product.node.handle}`} className="block">
                <div className="aspect-square bg-muted overflow-hidden">
                  {img ? (
                    <img src={img.url} alt={img.altText || product.node.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <Link to={`/product/${product.node.handle}`}>
                  <h3 className="text-sm font-medium text-card-foreground mb-1 line-clamp-2 hover:text-primary transition-colors">
                    {product.node.title}
                  </h3>
                </Link>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-1">{product.node.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg font-semibold text-foreground">
                    {parseFloat(price.amount).toFixed(2)} €
                  </span>
                  <Button size="sm" onClick={() => handleAdd(product)} disabled={isCartLoading}>
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
