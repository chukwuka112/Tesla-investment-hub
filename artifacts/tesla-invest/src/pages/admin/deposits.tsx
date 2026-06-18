import { useState } from "react";
import { useAdminGetDeposits, getAdminGetDepositsQueryKey, useAdminApproveDeposit, useAdminRejectDeposit } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function AdminDeposits() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");

  const { data, isLoading } = useAdminGetDeposits({ status, page: 1 }, {
    query: { enabled: !!token, queryKey: getAdminGetDepositsQueryKey({ status, page: 1 }) }
  });

  const approve = useAdminApproveDeposit();
  const reject = useAdminRejectDeposit();

  const handleApprove = (id: string) => {
    approve.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Deposit Approved" });
        queryClient.invalidateQueries({ queryKey: getAdminGetDepositsQueryKey({ status, page: 1 }) });
      }
    });
  };

  const handleReject = (id: string) => {
    reject.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Deposit Rejected" });
        queryClient.invalidateQueries({ queryKey: getAdminGetDepositsQueryKey({ status, page: 1 }) });
      }
    });
  };

  return (
    <AdminLayout title="Deposits">
      <div className="mb-6">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>User ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Date</TableHead>
              {status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : data?.map((d) => (
              <TableRow key={d.id} className="border-border/50">
                <TableCell className="font-mono text-xs text-muted-foreground">{d.user_id}</TableCell>
                <TableCell className="font-bold">${d.amount.toFixed(2)}</TableCell>
                <TableCell>{d.currency}</TableCell>
                <TableCell>{format(new Date(d.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                {status === 'pending' && (
                  <TableCell className="text-right space-x-2">
                    <Button variant="default" size="sm" onClick={() => handleApprove(d.id)} disabled={approve.isPending || reject.isPending}>Approve</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleReject(d.id)} disabled={approve.isPending || reject.isPending}>Reject</Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No deposits found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
