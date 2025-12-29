import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { HU } from "@/lib/i18n";
import type { User, UserCreate, UserUpdate } from "@/queries/users";

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserCreate | UserUpdate) => void;
  user?: User | null;
  isLoading?: boolean;
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const createUserSchema = z.object({
  username: z.string().min(3, HU.users.validation.usernameMin).max(100),
  email: z.string().email(HU.validation.invalidEmail),
  full_name: z.string().optional(),
  role: z.enum(["admin", "manager", "warehouse", "viewer"]),
  password: z
    .string()
    .min(8, HU.users.validation.passwordMin)
    .regex(passwordRegex, HU.users.validation.passwordWeak),
  is_active: z.boolean().default(true),
});

const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, HU.users.validation.usernameMin)
    .max(100)
    .optional(),
  email: z.string().email(HU.validation.invalidEmail).optional(),
  full_name: z.string().optional(),
  role: z.enum(["admin", "manager", "warehouse", "viewer"]).optional(),
  password: z
    .string()
    .min(8, HU.users.validation.passwordMin)
    .regex(passwordRegex, HU.users.validation.passwordWeak)
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

type FormData =
  | z.infer<typeof createUserSchema>
  | z.infer<typeof updateUserSchema>;

export function UserDialog({
  open,
  onClose,
  onSubmit,
  user,
  isLoading,
}: UserDialogProps) {
  const isEdit = !!user;
  const schema = isEdit ? updateUserSchema : createUserSchema;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      email: "",
      full_name: "",
      role: "warehouse",
      password: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        full_name: user.full_name || "",
        role: user.role,
        password: "",
        is_active: user.is_active,
      });
    } else {
      form.reset({
        username: "",
        email: "",
        full_name: "",
        role: "warehouse",
        password: "",
        is_active: true,
      });
    }
  }, [user, form]);

  const handleSubmit = (data: FormData) => {
    // Remove empty password for updates
    if (isEdit && data.password === "") {
      const { password, ...rest } = data;
      onSubmit(rest as UserUpdate);
    } else {
      onSubmit(data as UserCreate);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? HU.users.editUser : HU.users.createUser}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? HU.users.editUserDescription
              : HU.users.createUserDescription}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HU.users.username}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="felhasznalonev" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HU.users.email}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="email@example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Full Name */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HU.users.fullName}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Teljes Név" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HU.users.role}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={HU.users.selectRole} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">{HU.roles.admin}</SelectItem>
                      <SelectItem value="manager">
                        {HU.roles.manager}
                      </SelectItem>
                      <SelectItem value="warehouse">
                        {HU.roles.warehouse}
                      </SelectItem>
                      <SelectItem value="viewer">{HU.roles.viewer}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {HU.users.password}
                    {isEdit && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({HU.users.leaveBlankToKeep})
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="••••••••" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {HU.users.activeStatus}
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {HU.users.activeStatusDescription}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {HU.actions.cancel}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? HU.loading : HU.actions.save}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
