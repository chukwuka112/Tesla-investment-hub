import { useAdminGetAuditLogs, getAdminGetAuditLogsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

export default function AdminAuditLogs() {
  const { token } = useAuth();

  const { data, isLoading } = useAdminGetAuditLogs({ page: 1, limit: 100 }, {
    query: { enabled: !!token, queryKey: getAdminGetAuditLogsQueryKey({ page: 1, limit: 100 }) }
  });

  return (
    <AdminLayout title="Audit Logs">
      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Type</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : data?.map((log) => (
              <TableRow key={log.id} className="border-border/50">
                <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}</TableCell>
                <TableCell className="font-medium text-xs">{log.admin_name || log.admin_id}</TableCell>
                <TableCell>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                    {log.action}
                  </span>
                </TableCell>
                <TableCell className="text-xs uppercase text-muted-foreground">{log.target_type}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate" title={log.details || ''}>
                  {log.details || '-'}
                </TableCell>
              </TableRow>
            ))}
            {data?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
