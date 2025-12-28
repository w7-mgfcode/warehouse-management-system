import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductForm } from "@/components/products/product-form";

export default function ProductsNewPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/products")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Új termék</h1>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <ProductForm onSuccess={() => navigate("/products")} />
        </CardContent>
      </Card>
    </div>
  );
}
