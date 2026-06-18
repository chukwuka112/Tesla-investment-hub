import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetAnnouncements, getGetAnnouncementsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus, Bell, Pin, PinOff, Eye, EyeOff,
  Trash2, Pencil, Loader2, Megaphone,
} from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
};

const annSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  is_pinned: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

type AnnFormValues = z.infer<typeof annSchema>;

// ── Live Preview ──────────────────────────────────────────────────────────────
function AnnouncementPreview({ values }: { values: Partial<AnnFormValues> }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center uppercase tracking-wider">
        How it appears on the user dashboard
      </p>

      <div>
        <p className="text-xs text-muted-foreground mb-2">📌 Pinned banner (dashboard)</p>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-primary/10">
            <Bell className="h-16 w-16" />
          </div>
          <div className="flex items-start gap-3 relative z-10">
            <div className="mt-0.5 rounded-full bg-primary/20 p-1.5 text-primary flex-shrink-0">
              <Bell className="h-3 w-3" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold uppercase">
                {values.title || "Announcement Title"}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {values.content || "Your announcement content will appear here."}
              </p>
            </div>
          </div>
        </div>
        {!values.is_pinned && (
          <p className="text-xs text-amber-400/70 mt-1.5">
            ⚠️ Enable "Pin to dashboard" to show this banner to users.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border/50 bg-card/30 p-3 flex items-center gap-3">
        <div className={`h-2 w-2 rounded-full ${values.is_active ? "bg-green-400" : "bg-zinc-500"}`} />
        <p className="text-xs text-muted-foreground">
          {values.is_active ? "Visible to all users" : "Hidden — users cannot see this"}
        </p>
      </div>
    </div>
  );
}

// ── Form Dialog ───────────────────────────────────────────────────────────────
function AnnouncementDialog({
  open,
  onClose,
  editing,
  token,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Announcement | null;
  token: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const form = useForm<AnnFormValues>({
    resolver: zodResolver(annSchema),
    defaultValues: editing
      ? { title: editing.title, content: editing.content, is_pinned: editing.is_pinned, is_active: editing.is_active }
      : { title: "", content: "", is_pinned: false, is_active: true },
  });

  const watchedValues = form.watch();

  const onSubmit = async (data: AnnFormValues) => {
    setSaving(true);
    try {
      const url = editing ? `/api/admin/announcements/${editing.id}` : `/api/admin/announcements`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: "Failed", description: json.error || "Could not save", variant: "destructive" }); return; }
      toast({ title: editing ? "Announcement Updated" : "Announcement Published", description: `"${data.title}" is ${data.is_active ? "now live" : "saved as inactive"}.` });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">
            {editing ? "EDIT ANNOUNCEMENT" : "NEW ANNOUNCEMENT"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="edit" className="mt-2">
          <TabsList className="mb-4">
            <TabsTrigger value="edit">✏️ Edit</TabsTrigger>
            <TabsTrigger value="preview">👁️ Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="edit">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 🎉 New Feature Available" className="bg-card/50 border-border/50 h-10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write the announcement message for your users..."
                        rows={5}
                        className="bg-card/50 border-border/50 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="is_pinned" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 px-4 py-3 h-full">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Pin className="h-3.5 w-3.5 text-primary" /> Pin to dashboard
                          </p>
                          <p className="text-xs text-muted-foreground">Shows as banner on user home</p>
                        </div>
                      </div>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 px-4 py-3 h-full">
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5 text-green-400" /> Visible to users
                          </p>
                          <p className="text-xs text-muted-foreground">Toggle to hide without deleting</p>
                        </div>
                      </div>
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editing ? "Save Changes" : "Publish Announcement"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="preview">
            <div className="py-2"><AnnouncementPreview values={watchedValues} /></div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Announcement Card ─────────────────────────────────────────────────────────
function AnnouncementCard({ ann, token, onEdit, onRefresh }: {
  ann: Announcement; token: string | null; onEdit: () => void; onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const patch = async (updates: Partial<Omit<Announcement, "id" | "created_at">>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${ann.title}"? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements/${ann.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast({ title: "Announcement deleted" });
      onRefresh();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border bg-card p-5 transition-all ${ann.is_active ? "border-border/60" : "border-border/30 opacity-60"}`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`mt-0.5 rounded-full p-1.5 flex-shrink-0 ${ann.is_pinned ? "bg-primary/20 text-primary" : "bg-zinc-700/50 text-zinc-400"}`}>
          <Bell className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-sm tracking-wide text-white">{ann.title}</h3>
            {ann.is_pinned && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                <Pin className="h-2.5 w-2.5" /> Pinned
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ann.is_active ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}`}>
              {ann.is_active ? "Active" : "Hidden"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(ann.created_at), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-4 ml-9">{ann.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-9 flex-wrap">
        <button
          onClick={() => patch({ is_active: !ann.is_active })}
          disabled={loading}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all disabled:opacity-50 ${ann.is_active ? "border-green-500/40 text-green-400 hover:bg-green-500/10" : "border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/10"}`}
        >
          {ann.is_active ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
        </button>

        <button
          onClick={() => patch({ is_pinned: !ann.is_pinned })}
          disabled={loading}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-all disabled:opacity-50 ${ann.is_pinned ? "border-primary/40 text-primary hover:bg-primary/10" : "border-border/50 text-muted-foreground hover:text-white hover:border-border"}`}
        >
          {ann.is_pinned ? <><PinOff className="h-3 w-3" /> Unpin</> : <><Pin className="h-3 w-3" /> Pin</>}
        </button>

        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border/50 text-muted-foreground hover:text-white hover:border-border transition-all"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-transparent text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminAnnouncements() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "pinned">("all");

  const { data, isLoading } = useGetAnnouncements({
    query: { enabled: !!token, queryKey: getGetAnnouncementsQueryKey() },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetAnnouncementsQueryKey() });

  const allAnns = (data as Announcement[] | undefined) ?? [];
  const filtered = allAnns.filter((a) => {
    if (filter === "active") return a.is_active;
    if (filter === "pinned") return a.is_pinned;
    return true;
  });

  const activeCount = allAnns.filter((a) => a.is_active).length;
  const pinnedCount = allAnns.filter((a) => a.is_pinned).length;

  return (
    <AdminLayout title="Announcements">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          {(["all", "active", "pinned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? f === "active" ? "bg-green-500/20 text-green-400"
                    : f === "pinned" ? "bg-primary/20 text-primary"
                    : "bg-white/10 text-white"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              {f === "all" ? `All (${allAnns.length})` : f === "active" ? `Active (${activeCount})` : `Pinned (${pinnedCount})`}
            </button>
          ))}
        </div>
        <Button onClick={() => { setEditingAnn(null); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> New Announcement
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-36 rounded-xl border border-border/40 bg-card animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl">
          <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-display text-lg font-bold text-muted-foreground mb-2">
            {filter === "all" ? "No Announcements Yet" : `No ${filter} announcements`}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Broadcast messages to all users — promotions, maintenance notices, platform updates.
          </p>
          {filter === "all" && (
            <Button onClick={() => { setEditingAnn(null); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" /> Create First Announcement
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ann) => (
            <AnnouncementCard
              key={ann.id}
              ann={ann}
              token={token}
              onEdit={() => { setEditingAnn(ann); setDialogOpen(true); }}
              onRefresh={invalidate}
            />
          ))}
        </div>
      )}

      {allAnns.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Only <strong>active</strong> announcements are visible to users. Only <strong>pinned</strong> ones appear as banners on the dashboard.
        </p>
      )}

      {dialogOpen && (
        <AnnouncementDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingAnn(null); }}
          editing={editingAnn}
          token={token}
          onSaved={invalidate}
        />
      )}
    </AdminLayout>
  );
}
