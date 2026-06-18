import { useState } from "react";
import { useAdminGetWithdrawals, getAdminGetWithdrawalsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, Check } from "lucide-react";

type EnrichedWithdrawal = {
  id: string;
  user_id: string;
  username: string;
  user_email: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  wallet_address: string;
  network: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${variants[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Wallet address copied successfully." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center gap-1 rounded border border-border/50 bg-card px-2 py-1 text-xs text-muted-foreground hover:text-white hover:border-primary/50 transition-all"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function AdminWithdrawals() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data, isLoading } = useAdminGetWithdrawals({ status, page: 1 }, {
    query: { enabled: !!token, queryKey: getAdminGetWithdrawalsQueryKey({ status, page: 1 }) }
  });

  const withdrawals = data as unknown as EnrichedWithdrawal[] | undefined;

  const apiAction = async (id: string, action: "approve" | "reject" | "complete") => {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Action Failed", description: json.error || "Could not perform action", variant: "destructive" });
        return;
      }
      const labels: Record<string, string> = { approve: "Withdrawal Approved", reject: "Withdrawal Rejected", complete: "Marked as Completed" };
      toast({ title: labels[action] });
      queryClient.invalidateQueries({ queryKey: getAdminGetWithdrawalsQueryKey({ status, page: 1 }) });
      queryClient.invalidateQueries({ queryKey: getAdminGetWithdrawalsQueryKey({ status: "approved", page: 1 }) });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AdminLayout title="Withdrawals">
      <div className="mb-6">
        <Tabs value={status} onValueChange={setStatus}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Fee (4%)</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Wallet Address</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : withdrawals?.map((w) => (
              <TableRow key={w.id} className="border-border/50">
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{w.username}</p>
                    <p className="text-xs text-muted-foreground">{w.user_email}</p>
                  </div>
                </TableCell>
                <TableCell className="font-bold">${w.amount.toFixed(2)}</TableCell>
                <TableCell className="text-red-400 text-sm">-${(w.fee_amount ?? w.amount * 0.04).toFixed(2)}</TableCell>
                <TableCell className="text-green-400 font-medium">${(w.net_amount ?? w.amount * 0.96).toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center max-w-[200px]">
                    <span className="font-mono text-xs truncate">{w.wallet_address}</span>
                    <CopyButton text={w.wallet_address} />
                  </div>
                </TableCell>
                <TableCell className="text-sm">{w.network || "—"}</TableCell>
                <TableCell><StatusBadge status={w.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(w.created_at), "MMM d, yyyy HH:mm")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {w.status === "pending" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => apiAction(w.id, "approve")}
                          disabled={loadingId === w.id}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => apiAction(w.id, "reject")}
                          disabled={loadingId === w.id}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {w.status === "approved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                        onClick={() => apiAction(w.id, "complete")}
                        disabled={loadingId === w.id}
                      >
                        Mark Completed
                      </Button>
                    )}
                    {(w.status === "completed" || w.status === "rejected") && (
                      <span className="text-xs text-muted-foreground italic">No actions</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (!withdrawals || withdrawals.length === 0) && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No {status} withdrawals found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
