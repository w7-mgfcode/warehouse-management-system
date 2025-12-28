import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginFormData } from "@/schemas/auth";
import { useLoginMutation } from "@/queries/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data, {
      onSuccess: () => {
        navigate("/dashboard");
      },
    });
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Bejelentkezés</h1>
        <p className="text-muted-foreground">WMS - Raktárkezelő Rendszer</p>
      </div>

      {loginMutation.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Hibás felhasználónév vagy jelszó. Kérjük, próbálja újra.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Felhasználónév</Label>
          <Input
            id="username"
            placeholder="Adja meg a felhasználónevet"
            autoComplete="username"
            {...register("username")}
          />
          {errors.username && (
            <p className="text-sm text-error">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Jelszó</Label>
          <Input
            id="password"
            type="password"
            placeholder="Adja meg a jelszót"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-error">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? "Bejelentkezés..." : "Bejelentkezés"}
        </Button>
      </form>
    </div>
  );
}
