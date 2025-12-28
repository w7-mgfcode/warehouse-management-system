import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BinForm } from "@/components/bins/bin-form";

export default function BinsNewPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/bins")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Új tárolóhely</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <BinForm onSuccess={() => navigate("/bins")} />
        </CardContent>
      </Card>
    </div>
  );
}
