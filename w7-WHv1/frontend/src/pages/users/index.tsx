import { useState } from "react";
import { Plus } from "lucide-react";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserList } from "@/components/users/user-list";
import { UserDialog } from "@/components/users/user-dialog";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type User,
  type UserCreate,
  type UserUpdate,
} from "@/queries/users";
import { HU } from "@/lib/i18n";
import { toast } from "sonner";
import type { APIError } from "@/types/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UsersIndexPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const { data, isLoading } = useUsers({ page: 1, page_size: 100 });
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(selectedUser?.id || "");
  const deleteMutation = useDeleteUser();

  const handleCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!userToDelete) return;

    deleteMutation.mutate(userToDelete, {
      onSuccess: () => {
        toast.success(HU.users.userDeleted);
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      },
      onError: (error) => {
        const axiosError = error as AxiosError<APIError>;
        const message = axiosError.response?.data?.detail;
        toast.error(typeof message === "string" ? message : HU.errors.generic);
      },
    });
  };

  const handleSubmit = (data: UserCreate | UserUpdate) => {
    if (selectedUser) {
      // Update existing user
      updateMutation.mutate(data as UserUpdate, {
        onSuccess: () => {
          toast.success(HU.users.userUpdated);
          setDialogOpen(false);
          setSelectedUser(null);
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(
            typeof message === "string" ? message : HU.errors.generic
          );
        },
      });
    } else {
      // Create new user
      createMutation.mutate(data as UserCreate, {
        onSuccess: () => {
          toast.success(HU.users.userCreated);
          setDialogOpen(false);
        },
        onError: (error) => {
          const axiosError = error as AxiosError<APIError>;
          const message = axiosError.response?.data?.detail;
          toast.error(
            typeof message === "string" ? message : HU.errors.generic
          );
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{HU.nav.users}</h1>
          <p className="text-muted-foreground mt-2">
            {HU.users.pageDescription}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {HU.users.createUser}
        </Button>
      </div>

      {/* Stats Card */}
      {data && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {HU.users.totalUsers}
                </p>
                <p className="text-2xl font-bold">{data.total}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {HU.users.activeUsers}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {data.items.filter((u) => u.is_active).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {HU.users.inactiveUsers}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {data.items.filter((u) => !u.is_active).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {HU.users.adminUsers}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {data.items.filter((u) => u.role === "admin").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <UserList
        users={data?.items || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* Create/Edit Dialog */}
      <UserDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleSubmit}
        user={selectedUser}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{HU.users.deleteUser}</AlertDialogTitle>
            <AlertDialogDescription>
              {HU.users.deleteUserConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{HU.actions.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {HU.actions.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
