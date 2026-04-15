import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { storefrontApiRequest, PRODUCT_BY_HANDLE_QUERY } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/Button";
import { ShoppingCart, Loader2, ArrowLeft, Package, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProductDetail() {
  const { handle } = useParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const isCartLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    if (!handle) return;
    storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle })
      .then((data) => setProduct(data?.data?.productByHandle))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Produit introuvable</p>
          <Link to="/" className="text-primary mt-4 inline-block">Retour au catalogue</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const variant = product.variants.edges[selectedVariantIdx]?.node;
  const images = product.images.edges;

  const handleAdd = async () => {
    if (!variant) return;
    await addItem({
      product: { node: product },
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success(`${quantity}x ${product.title} ajouté au panier`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour au catalogue
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-3">
              {images[selectedImage]?.node ? (
                <img src={images[selectedImage].node.url} alt={images[selectedImage].node.altText || product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package className="h-16 w-16 text-muted-foreground" /></div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img: any, i: number) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`w-16 h-16 rounded border overflow-hidden ${i === selectedImage ? 'border-primary' : 'border-border'}`}>
                    <img src={img.node.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">{product.title}</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">{product.description}</p>

            {product.options.length > 0 && product.options[0].name !== "Title" && (
              <div className="mb-6">
                {product.options.map((opt: any, oi: number) => (
                  <div key={oi} className="mb-4">
                    <label className="text-sm font-medium text-foreground mb-2 block">{opt.name}</label>
                    <div className="flex gap-2 flex-wrap">
                      {product.variants.edges.map((v: any, vi: number) => (
                        <button
                          key={vi}
                          onClick={() => setSelectedVariantIdx(vi)}
                          className={`px-3 py-1.5 text-sm rounded border transition-colors ${vi === selectedVariantIdx ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:border-foreground'}`}
                        >
                          {v.node.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-6">
              <span className="font-heading text-3xl font-semibold text-foreground">
                {variant ? parseFloat(variant.price.amount).toFixed(2) : "—"} €
              </span>
              <span className="text-sm text-muted-foreground ml-2">HT</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-border rounded-lg">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setQuantity(quantity + 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button size="lg" className="flex-1 font-semibold" onClick={handleAdd} disabled={isCartLoading || !variant?.availableForSale}>
                {isCartLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4 mr-2" /> Ajouter au panier</>}
              </Button>
            </div>

            {variant && !variant.availableForSale && (
              <p className="text-sm text-destructive">Ce produit est actuellement indisponible</p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
