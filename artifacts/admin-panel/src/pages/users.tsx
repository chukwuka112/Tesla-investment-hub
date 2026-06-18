import { useState } from "react";
import { Link } from "wouter";
import { useAdminGetUsers, getAdminGetUsersQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function AdminUsers() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminGetUsers({ search, page: 1, limit: 50 }, {
    query: { enabled: !!token, queryKey: getAdminGetUsersQueryKey({ search, page: 1, limit: 50 }) }
  });

  return (
    <AdminLayout title="Users Management">
      <div className="mb-6 flex gap-4">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md bg-card border-border/50"
        />
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : data?.users?.map((u) => (
              <TableRow key={u.id} className="border-border/50">
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>${u.balance.toFixed(2)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                    {u.is_active ? 'Active' : 'Suspended'}
                  </span>
                </TableCell>
                <TableCell>{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/users/${u.id}`}>
                    <Button variant="outline" size="sm">Manage</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !data?.users?.length && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
