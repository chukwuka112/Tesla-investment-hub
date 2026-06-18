import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetPlans, getGetPlansQueryKey, 
  useGetDashboard, getGetDashboardQueryKey,
  useCreateInvestment 
} from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Wallet, AlertCircle } from "lucide-react";

export default function Invest() {
  const [, params] = useRoute("/invest/:id");
  const planId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token } = useAuth();
  
  const { data: plans, isLoading: loadingPlans } = useGetPlans({
    query: { enabled: !!token && !!planId, queryKey: getGetPlansQueryKey() }
  });
  
  const { data: dashboard, isLoading: loadingDash } = useGetDashboard({
    query: { enabled: !!token, queryKey: getGetDashboardQueryKey() }
  });

  const plan = plans?.find(p => p.id === planId);
  const balance = dashboard?.balance || 0;

  const investSchema = z.object({
    amount: z.coerce.number()
      .min(plan?.min_amount || 0, `Minimum investment is $${plan?.min_amount || 0}`)
      .max(plan?.max_amount || 0, `Maximum investment is $${plan?.max_amount || 0}`)
      .refine(val => val <= balance, "Insufficient balance"),
  });

  type InvestFormValues = z.infer<typeof investSchema>;

  const form = useForm<InvestFormValues>({
    resolver: zodResolver(investSchema),
    defaultValues: {
      amount: plan?.min_amount || 0,
    },
  });

  const createInvestment = useCreateInvestment();

  const onSubmit = (data: InvestFormValues) => {
    if (!planId) return;
    
    createInvestment.mutate(
      { data: { plan_id: planId, amount: data.amount } },
      {
        onSuccess: () => {
          toast({
            title: "Investment Active",
            description: `Successfully invested in ${plan?.name}`,
          });
          setLocation("/");
        },
        onError: (err: any) => {
          toast({
            title: "Investment Failed",
            description: err?.data?.error || "Could not process investment",
            variant: "destructive",
          });
        },
      }
    );
  };

  const amount = form.watch("amount") || 0;
  const dailyReturn = (amount * ((plan?.roi_percentage || 0) / 100)).toFixed(2);
  const totalReturn = (Number(dailyReturn) * (plan?.duration_days || 0)).toFixed(2);

  if (loadingPlans || loadingDash) {
    return (
      <MobileLayout>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MobileLayout>
    );
  }

  if (!plan) {
    return (
      <MobileLayout>
        <div className="p-8 text-center">Plan not found</div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-6">
        <button 
          onClick={() => setLocation("/plans")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider uppercase">{plan.name}</h1>
            {plan.model_name && <p className="text-primary text-sm uppercase tracking-widest">{plan.model_name}</p>}
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground uppercase">Available Balance</span>
              </div>
              <span className="font-display font-bold text-lg">${balance.toFixed(2)}</span>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Investment Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-display text-lg text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            className="bg-background border-border/50 h-14 pl-8 text-lg font-display focus-visible:ring-primary" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] text-muted-foreground">Min: ${plan.min_amount}</span>
                        <span className="text-[10px] text-muted-foreground">Max: ${plan.max_amount}</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg bg-background p-4 border border-border space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Daily Return ({plan.roi_percentage}%)</span>
                    <span className="font-display font-medium text-accent">+${dailyReturn}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-display font-medium">{plan.duration_days} Days</span>
                  </div>
                  <div className="h-px w-full bg-border/50" />
                  <div className="flex justify-between text-base font-bold">
                    <span>Total Expected Return</span>
                    <span className="font-display text-green-500">${totalReturn}</span>
                  </div>
                </div>

                {balance < (plan.min_amount || 0) && (
                  <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 p-3 rounded-md border border-destructive/20">
                    <AlertCircle className="h-4 w-4" />
                    Insufficient balance to meet minimum investment.
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-14 font-display font-bold tracking-wider text-lg bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
                  disabled={createInvestment.isPending || balance < (plan.min_amount || 0)}
                >
                  {createInvestment.isPending ? "PROCESSING..." : "CONFIRM DEPLOYMENT"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
