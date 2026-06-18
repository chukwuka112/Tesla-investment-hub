import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const resetSchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
  confirm_password: z.string().min(8, "Please confirm your password"),
}).refine(d => d.new_password === d.confirm_password, {
  message: "Passwords do not match",
  path: ["confirm_password"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const resetToken = sessionStorage.getItem("reset_token");

  useEffect(() => {
    if (!resetToken) {
      setLocation("/forgot-password");
    }
  }, [resetToken, setLocation]);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = async (data: ResetFormValues) => {
    if (!resetToken) return;
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: resetToken, new_password: data.new_password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Reset Failed", description: json.error || "Could not reset password", variant: "destructive" });
        return;
      }
      sessionStorage.removeItem("reset_token");
      toast({ title: "Password Reset", description: "Your password has been updated. Please log in." });
      setLocation("/login");
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  if (!resetToken) return null;

  return (
    <div className="flex min-h-screen max-w-[430px] mx-auto flex-col bg-background px-6 py-8">
      <button
        onClick={() => setLocation("/forgot-password")}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-white mb-8"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-wider text-white mb-3">NEW<br/>PASSWORD</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong new password for your account.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField control={form.control} name="new_password" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className="bg-card/50 border-border/50 h-12 focus-visible:ring-primary/50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="confirm_password" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" className="bg-card/50 border-border/50 h-12 focus-visible:ring-primary/50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button
            type="submit"
            className="w-full h-12 mt-6 font-display font-bold tracking-wider text-md bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "UPDATING..." : "UPDATE PASSWORD"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
