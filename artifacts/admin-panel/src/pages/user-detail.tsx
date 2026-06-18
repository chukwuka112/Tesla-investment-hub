import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useAdminGetUser, getAdminGetUserQueryKey, useAdminUpdateUser } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUserDetail() {
  const [, params] = useRoute("/users/:id");
  const userId = params?.id || "";
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useAdminGetUser(userId, {
    query: { enabled: !!token && !!userId, queryKey: getAdminGetUserQueryKey(userId) }
  });

  const updateUser = useAdminUpdateUser();
  const [balanceInput, setBalanceInput] = useState("");

  const handleUpdateStatus = (isActive: boolean) => {
    updateUser.mutate(
      { id: userId, data: { is_active: isActive } },
      {
        onSuccess: () => {
          toast({ title: "User updated" });
          queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
        }
      }
    );
  };

  const handleUpdateBalance = () => {
    const val = parseFloat(balanceInput);
    if (isNaN(val)) return;
    updateUser.mutate(
      { id: userId, data: { balance: val } },
      {
        onSuccess: () => {
          toast({ title: "Balance updated" });
          setBalanceInput("");
          queryClient.invalidateQueries({ queryKey: getAdminGetUserQueryKey(userId) });
        }
      }
    );
  };

  if (isLoading || !data) return <AdminLayout title="Loading..."><div /></AdminLayout>;

  return (
    <AdminLayout title={`User: ${data.user.full_name}`}>
      <div className="mb-6">
        <Link href="/users" className="flex items-center text-sm text-muted-foreground hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border bg-card col-span-1">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Full Name</p>
              <p className="font-medium">{data.user.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p>{data.user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="capitalize">{data.user.role}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-xl font-display font-bold">${data.user.balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <span className={`px-2 py-1 rounded-full text-xs ${data.user.is_active ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                {data.user.is_active ? 'Active' : 'Suspended'}
              </span>
            </div>
            <div className="pt-4 space-y-3">
              <div className="flex gap-2">
                <Input type="number" placeholder="New Balance" value={balanceInput} onChange={e => setBalanceInput(e.target.value)} />
                <Button onClick={handleUpdateBalance} disabled={updateUser.isPending}>Update</Button>
              </div>
              <Button
                variant={data.user.is_active ? "destructive" : "default"}
                className="w-full"
                onClick={() => handleUpdateStatus(!data.user.is_active)}
                disabled={updateUser.isPending}
              >
                {data.user.is_active ? 'Suspend User' : 'Activate User'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
