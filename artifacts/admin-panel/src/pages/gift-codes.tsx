import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAdminGetGiftCodes, getAdminGetGiftCodesQueryKey, useAdminCreateGiftCode, useAdminDeleteGiftCode } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

const codeSchema = z.object({
  reward_amount: z.coerce.number().min(1),
  max_uses: z.coerce.number().min(1),
  expires_at: z.string().min(1),
});

type CodeFormValues = z.infer<typeof codeSchema>;

export default function AdminGiftCodes() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useAdminGetGiftCodes({
    query: { enabled: !!token, queryKey: getAdminGetGiftCodesQueryKey() }
  });

  const createCode = useAdminCreateGiftCode();
  const deleteCode = useAdminDeleteGiftCode();

  const form = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: {
      reward_amount: 10,
      max_uses: 100,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const onSubmit = (values: CodeFormValues) => {
    createCode.mutate(
      { data: { ...values, expires_at: new Date(values.expires_at).toISOString() } },
      {
        onSuccess: () => {
          toast({ title: "Code Created" });
          setOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getAdminGetGiftCodesQueryKey() });
        },
        onError: () => toast({ title: "Failed to create code", variant: "destructive" })
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this gift code?")) return;
    deleteCode.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Code Deleted" });
        queryClient.invalidateQueries({ queryKey: getAdminGetGiftCodesQueryKey() });
      }
    });
  };

  const codes = data as any[];

  return (
    <AdminLayout title="Gift Codes">
      <div className="mb-6 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Create Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display tracking-wider">CREATE GIFT CODE</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                <FormField control={form.control} name="reward_amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward Amount ($)</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="max_uses" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Uses</FormLabel>
                    <FormControl><Input type="number" min="1" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expires_at" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expires At</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-primary" disabled={createCode.isPending}>
                    {createCode.isPending ? "Creating..." : "Create Code"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead>Code</TableHead>
              <TableHead>Reward</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : codes?.map((c: any) => (
              <TableRow key={c.id} className="border-border/50">
                <TableCell className="font-mono font-bold tracking-wider">{c.code}</TableCell>
                <TableCell className="text-green-400 font-medium">${c.reward_amount.toFixed(2)}</TableCell>
                <TableCell>{c.current_uses ?? 0} / {c.max_uses}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{format(new Date(c.expires_at), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${c.is_active ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (!codes || codes.length === 0) && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No gift codes found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
