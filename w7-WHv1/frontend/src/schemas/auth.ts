import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "A felhasználónév kötelező")
    .min(3, "A felhasználónév legalább 3 karakter legyen"),
  password: z
    .string()
    .min(1, "A jelszó kötelező")
    .min(8, "A jelszó legalább 8 karakter legyen"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "A jelenlegi jelszó kötelező"),
    new_password: z
      .string()
      .min(8, "Az új jelszó legalább 8 karakter legyen")
      .regex(/[A-Z]/, "Az új jelszónak tartalmaznia kell nagy betűt")
      .regex(/[a-z]/, "Az új jelszónak tartalmaznia kell kis betűt")
      .regex(/[0-9]/, "Az új jelszónak tartalmaznia kell számot"),
    confirm_password: z.string().min(1, "A jelszó megerősítése kötelező"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "A jelszavak nem egyeznek",
    path: ["confirm_password"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
