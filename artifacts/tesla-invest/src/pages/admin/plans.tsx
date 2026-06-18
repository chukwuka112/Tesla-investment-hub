import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useAdminGetPlans,
  getAdminGetPlansQueryKey,
  useAdminCreatePlan,
  useAdminUpdatePlan,
  useAdminDeletePlan,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  ImageIcon, Upload, Zap, Clock, ShieldCheck,
  TrendingUp, ArrowRight, Loader2, Sparkles,
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  model_name?: string | null;
  image_url: string;
  min_amount: number;
  max_amount: number;
  roi_percentage: number;
  duration_days: number;
  description?: string | null;
  status: string;
  display_order: number;
};

const MAX_IMAGE_WIDTH = 900;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_WIDTH) {
          height = Math.round(height * MAX_IMAGE_WIDTH / width);
          width = MAX_IMAGE_WIDTH;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const planSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  model_name: z.string().optional(),
  image_url: z.string().min(1, "Image is required"),
  min_amount: z.coerce.number().min(1, "Minimum must be at least $1"),
  max_amount: z.coerce.number().min(1, "Maximum must be at least $1"),
  no_max_limit: z.boolean().default(false),
  roi_percentage: z.coerce.number().min(0.01, "ROI must be positive"),
  duration_days: z.coerce.number().int().min(1, "Duration must be at least 1 day"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  display_order: z.coerce.number().int().default(0),
});

type PlanFormValues = z.infer<typeof planSchema>;

// ── Live Preview Card ─────────────────────────────────────────────────────────
function PlanPreviewCard({ values }: { values: Partial<PlanFormValues> }) {
  const noMax = values.no_max_limit || (values.max_amount ?? 0) >= 999999;
  const minFmt = `$${(values.min_amount ?? 0).toLocaleString()}`;
  const maxFmt = noMax ? `$${(values.min_amount ?? 0).toLocaleString()}+` : `$${(values.max_amount ?? 0).toLocaleString()}`;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-xl">
      {/* ROI badge */}
      <div className="absolute top-4 right-4 z-20">
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-green-500/30 bg-green-500/20 text-xs font-bold tracking-wider text-green-400">
          <TrendingUp className="h-3 w-3" />
          {values.roi_percentage ?? 0}% PROFIT
        </div>
      </div>

      {/* Image */}
      <div className="relative h-44 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent z-10" />
        {values.image_url ? (
          <img
            src={values.image_url}
            alt={values.name ?? "Plan"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-zinc-800">
            <ImageIcon className="h-12 w-12 text-zinc-600" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-4">
          <h3 className="font-display text-xl font-black tracking-wider text-white uppercase leading-none">
            {values.name || "Plan Name"}
          </h3>
          {values.model_name && (
            <p className="text-xs text-white/60 uppercase tracking-widest mt-0.5">{values.model_name}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-sm text-white/50 mb-4 leading-relaxed min-h-[2.5rem]">
          {values.description || "No description provided."}
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: <Zap className="h-4 w-4 text-yellow-400" />, val: `${values.roi_percentage ?? 0}%`, label: "Profit" },
            { icon: <Clock className="h-4 w-4 text-blue-400" />, val: values.duration_days ?? 0, label: "Days" },
            { icon: <ShieldCheck className="h-4 w-4 text-green-400" />, val: minFmt, label: "Min" },
          ].map(({ icon, val, label }) => (
            <div key={label} className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl py-2.5">
              {icon}
              <span className="font-mono text-sm font-bold text-white mt-1">{val}</span>
              <span className="text-[9px] uppercase tracking-wider text-white/40">{label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-white/40 uppercase tracking-wider">Deposit Range</span>
          <span className="text-sm font-mono font-bold text-white">{minFmt} – {maxFmt}</span>
        </div>
        <button className="w-full flex items-center justify-center gap-2 bg-[#CC0000] text-white font-display font-bold uppercase tracking-widest text-sm h-11 rounded-xl">
          INVEST NOW <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Image Upload Input ────────────────────────────────────────────────────────
function ImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlMode, setUrlMode] = useState(!value || value.startsWith("http"));
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      onChange(compressed);
      setUrlMode(false);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div
        className="relative h-36 w-full rounded-xl border-2 border-dashed border-border overflow-hidden cursor-pointer group hover:border-primary/60 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="Plan" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="h-6 w-6 text-white" />
              <span className="ml-2 text-sm text-white font-medium">Replace Image</span>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8" />
                <span className="text-sm">Click to upload image</span>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Toggle URL / Upload */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUrlMode(false)}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${!urlMode ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-white"}`}
        >
          <Upload className="h-3 w-3 inline mr-1" />Upload File
        </button>
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${urlMode ? "bg-primary text-white" : "bg-card text-muted-foreground hover:text-white"}`}
        >
          🔗 Use URL
        </button>
      </div>

      {urlMode && (
        <Input
          placeholder="https://example.com/image.jpg"
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-card/50 border-border/50 h-10 text-sm"
        />
      )}
    </div>
  );
}

// ── Plan Form Dialog ──────────────────────────────────────────────────────────
function PlanFormDialog({
  open,
  onClose,
  editing,
  nextOrder,
  token,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Plan | null;
  nextOrder: number;
  token: string | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const createPlan = useAdminCreatePlan();
  const updatePlan = useAdminUpdatePlan();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          model_name: editing.model_name ?? "",
          image_url: editing.image_url,
          min_amount: editing.min_amount,
          max_amount: editing.max_amount >= 999999 ? 0 : editing.max_amount,
          no_max_limit: editing.max_amount >= 999999,
          roi_percentage: editing.roi_percentage,
          duration_days: editing.duration_days,
          description: editing.description ?? "",
          status: editing.status as "active" | "inactive",
          display_order: editing.display_order,
        }
      : {
          name: "",
          model_name: "",
          image_url: "",
          min_amount: 100,
          max_amount: 1000,
          no_max_limit: false,
          roi_percentage: 20,
          duration_days: 7,
          description: "",
          status: "active",
          display_order: nextOrder,
        },
  });

  const watchedValues = form.watch();
  const noMaxLimit = form.watch("no_max_limit");

  const onSubmit = async (data: PlanFormValues) => {
    const payload = {
      name: data.name,
      model_name: data.model_name || null,
      image_url: data.image_url,
      min_amount: data.min_amount,
      max_amount: data.no_max_limit ? 9999999 : data.max_amount,
      roi_percentage: data.roi_percentage,
      duration_days: data.duration_days,
      description: data.description || null,
      status: data.status,
      display_order: data.display_order,
    };

    if (editing) {
      updatePlan.mutate(
        { id: editing.id, data: payload as any },
        {
          onSuccess: () => {
            toast({ title: "Plan Updated", description: `"${data.name}" has been updated.` });
            onSaved();
            onClose();
          },
          onError: (err: any) => {
            toast({ title: "Update Failed", description: err?.data?.error || "Could not update plan", variant: "destructive" });
          },
        }
      );
    } else {
      createPlan.mutate(
        { data: payload as any },
        {
          onSuccess: () => {
            toast({ title: "Plan Created", description: `"${data.name}" is now live.` });
            onSaved();
            onClose();
          },
          onError: (err: any) => {
            toast({ title: "Create Failed", description: err?.data?.error || "Could not create plan", variant: "destructive" });
          },
        }
      );
    }
  };

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">
            {editing ? "EDIT PLAN" : "CREATE NEW PLAN"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="mb-4">
            <TabsTrigger value="details">✏️ Details</TabsTrigger>
            <TabsTrigger value="preview">👁️ Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Plan Image */}
                <FormField control={form.control} name="image_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Plan Image</FormLabel>
                    <FormControl>
                      <ImageInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Name + Model */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Plan Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Starter Plan" className="bg-card/50 border-border/50 h-10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="model_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Subtitle / Model</FormLabel>
                      <FormControl><Input placeholder="e.g. Model 3" className="bg-card/50 border-border/50 h-10" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* ROI + Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="roi_percentage" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Profit %</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" step="0.01" min="0" placeholder="20" className="bg-card/50 border-border/50 h-10 pr-8" {...field} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="duration_days" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Duration (Days)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type="number" min="1" placeholder="7" className="bg-card/50 border-border/50 h-10 pr-14" {...field} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">days</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Min + Max amounts */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="min_amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Min Investment ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input type="number" min="1" placeholder="100" className="bg-card/50 border-border/50 h-10 pl-6" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="max_amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Max Investment ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number" min="1" placeholder="1000"
                            disabled={noMaxLimit}
                            className="bg-card/50 border-border/50 h-10 pl-6 disabled:opacity-40"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* No max limit toggle */}
                <FormField control={form.control} name="no_max_limit" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 px-4 py-3">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <p className="text-sm font-medium">No Maximum Limit</p>
                        <p className="text-xs text-muted-foreground">Enable for plans with no upper investment cap (shown as "$X+")</p>
                      </div>
                    </div>
                  </FormItem>
                )} />

                {/* Description */}
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this investment plan to users..."
                        rows={3}
                        className="bg-card/50 border-border/50 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Status + Order */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-card/50 border-border/50 h-10">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">✅ Active (visible to users)</SelectItem>
                          <SelectItem value="inactive">⏸ Inactive (hidden)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="display_order" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" className="bg-card/50 border-border/50 h-10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editing ? "Save Changes" : "Create Plan"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="preview">
            <div className="py-2">
              <p className="text-xs text-muted-foreground mb-4 text-center uppercase tracking-wider">
                Live preview — exactly as users will see it
              </p>
              <div className="max-w-sm mx-auto">
                <PlanPreviewCard values={watchedValues} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Plan Card (admin view) ────────────────────────────────────────────────────
function AdminPlanCard({
  plan,
  isFirst,
  isLast,
  onEdit,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  loading,
}: {
  plan: Plan;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  loading: boolean;
}) {
  const noMax = plan.max_amount >= 999999;

  return (
    <div className={`relative flex gap-4 rounded-xl border bg-card p-4 transition-all ${
      plan.status === "active" ? "border-border/60" : "border-border/30 opacity-60"
    }`}>
      {/* Thumbnail */}
      <div className="relative h-24 w-32 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
        {plan.image_url ? (
          <img src={plan.image_url} alt={plan.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-zinc-700" />
          </div>
        )}
        {/* status overlay */}
        {plan.status !== "active" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">INACTIVE</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-display font-bold text-base tracking-wide text-white leading-none">{plan.name}</h3>
            {plan.model_name && (
              <p className="text-xs text-muted-foreground mt-0.5">{plan.model_name}</p>
            )}
          </div>
          <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
            plan.status === "active"
              ? "bg-green-500/20 text-green-400"
              : "bg-zinc-500/20 text-zinc-400"
          }`}>
            {plan.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-400" />
            <span className="text-white font-mono font-bold">{plan.roi_percentage}%</span> profit
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-400" />
            <span className="text-white font-mono font-bold">{plan.duration_days}</span> days
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-green-400" />
            ${plan.min_amount.toLocaleString()} – {noMax ? `$${plan.min_amount.toLocaleString()}+` : `$${plan.max_amount.toLocaleString()}`}
          </span>
        </div>

        {plan.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{plan.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end justify-between flex-shrink-0 gap-2">
        <div className="flex items-center gap-1">
          {/* Reorder */}
          <button
            onClick={onMoveUp}
            disabled={isFirst || loading}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-card border border-transparent hover:border-border/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast || loading}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-card border border-transparent hover:border-border/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle status */}
          <button
            onClick={onToggle}
            disabled={loading}
            title={plan.status === "active" ? "Disable plan" : "Enable plan"}
            className={`h-7 px-2 text-xs rounded border transition-all disabled:opacity-50 ${
              plan.status === "active"
                ? "border-green-500/40 text-green-400 hover:bg-green-500/10"
                : "border-zinc-500/40 text-zinc-400 hover:bg-zinc-500/10"
            }`}
          >
            {plan.status === "active" ? "Disable" : "Enable"}
          </button>
          {/* Edit */}
          <button
            onClick={onEdit}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-white hover:bg-primary/20 border border-transparent hover:border-primary/30 transition-all"
            title="Edit plan"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {/* Delete */}
          <button
            onClick={onDelete}
            disabled={loading}
            className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all disabled:opacity-50"
            title="Delete plan"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPlans() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const { data, isLoading } = useAdminGetPlans({
    query: { enabled: !!token, queryKey: getAdminGetPlansQueryKey() },
  });

  const deletePlan = useAdminDeletePlan();
  const updatePlan = useAdminUpdatePlan();

  const plans = (data as Plan[] | undefined) ?? [];
  const sorted = [...plans].sort((a, b) => a.display_order - b.display_order);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getAdminGetPlansQueryKey() });

  const openCreate = () => {
    setEditingPlan(null);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setDialogOpen(true);
  };

  const handleToggleStatus = async (plan: Plan) => {
    setActionLoading(plan.id);
    try {
      const newStatus = plan.status === "active" ? "inactive" : "active";
      updatePlan.mutate(
        { id: plan.id, data: { status: newStatus } as any },
        {
          onSuccess: () => {
            toast({ title: newStatus === "active" ? "Plan Enabled" : "Plan Disabled", description: `"${plan.name}" is now ${newStatus}.` });
            invalidate();
          },
          onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
          onSettled: () => setActionLoading(null),
        }
      );
    } catch {
      setActionLoading(null);
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return;
    setActionLoading(plan.id);
    deletePlan.mutate(
      { id: plan.id },
      {
        onSuccess: () => {
          toast({ title: "Plan Deleted", description: `"${plan.name}" has been removed.` });
          invalidate();
        },
        onError: () => toast({ title: "Failed to delete plan", variant: "destructive" }),
        onSettled: () => setActionLoading(null),
      }
    );
  };

  const handleMove = async (plan: Plan, direction: "up" | "down") => {
    const idx = sorted.findIndex((p) => p.id === plan.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const swapPlan = sorted[swapIdx];
    const orders = [
      { id: plan.id, display_order: swapPlan.display_order },
      { id: swapPlan.id, display_order: plan.display_order },
    ];

    setActionLoading(plan.id);
    try {
      const res = await fetch("/api/admin/plans/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orders }),
      });
      if (!res.ok) throw new Error("Reorder failed");
      invalidate();
    } catch {
      toast({ title: "Failed to reorder", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSeed = async () => {
    if (!confirm("This will create the 5 default Tesla Invest plans. Continue?")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/plans/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Seed Failed", description: json.error, variant: "destructive" });
        return;
      }
      toast({ title: "Plans Seeded!", description: "5 default plans have been created." });
      invalidate();
    } finally {
      setSeeding(false);
    }
  };

  const activePlans = plans.filter((p) => p.status === "active").length;

  return (
    <AdminLayout title="Investment Plans">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">
            {plans.length} plans total · {activePlans} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {plans.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeed}
              disabled={seeding}
              className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            >
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Seed Example Plans
            </Button>
          )}
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Plan
          </Button>
        </div>
      </div>

      {/* Plan List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border/40 bg-card animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/50 rounded-xl">
          <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-display text-lg font-bold text-muted-foreground mb-2">No Plans Yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Create investment plans that users can browse and invest in.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSeed} disabled={seeding} className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Seed 5 Example Plans
            </Button>
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Create First Plan
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((plan, idx) => (
            <AdminPlanCard
              key={plan.id}
              plan={plan}
              isFirst={idx === 0}
              isLast={idx === sorted.length - 1}
              loading={actionLoading === plan.id}
              onEdit={() => openEdit(plan)}
              onToggle={() => handleToggleStatus(plan)}
              onDelete={() => handleDelete(plan)}
              onMoveUp={() => handleMove(plan, "up")}
              onMoveDown={() => handleMove(plan, "down")}
            />
          ))}
        </div>
      )}

      {/* Note */}
      {sorted.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Changes reflect instantly on the user-facing plans page. Use ↑↓ arrows to reorder plans.
        </p>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <PlanFormDialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); setEditingPlan(null); }}
          editing={editingPlan}
          nextOrder={plans.length}
          token={token}
          onSaved={invalidate}
        />
      )}
    </AdminLayout>
  );
}
