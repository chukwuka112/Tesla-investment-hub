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

  const onSubmit = (data: CodeFormValues) => {
    createCode.mutate(
      { data: { ...data, expires_at: new Date(data.expires_at).toISOString() } },
      {
        onSuccess: () => {
          toast({ title: "Code Created" });
          setOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getAdminGetGiftCodesQueryKey() });
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to deactivate this code?")) {
      deleteCode.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Code Deactivated" });
            queryClient.invalidateQueries({ queryKey: getAdminGetGiftCodesQueryKey() });
          }
        }
      );
    }
  };

  return (
    <AdminLayout title="Gift Codes">
      <div className="mb-6 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Code</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Gift Code</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="reward_amount" render={({ field }) => (
                  <FormItem><FormLabel>Reward Amount ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="max_uses" render={({ field }) => (
                  <FormItem><FormLabel>Max Uses</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="expires_at" render={({ field }) => (
                  <FormItem><FormLabel>Expires At</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createCode.isPending}>Generate Code</Button>
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
            ) : data?.map((c) => (
              <TableRow key={c.id} className="border-border/50">
                <TableCell className="font-mono font-bold tracking-widest">{c.code}</TableCell>
                <TableCell>${c.reward_amount.toFixed(2)}</TableCell>
                <TableCell>{c.uses_count} / {c.max_uses}</TableCell>
                <TableCell>{format(new Date(c.expires_at), "MMM d, yyyy")}</TableCell>
                <TableCell>{c.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell className="text-right space-x-2">
                  {c.is_active && <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>Deactivate</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
