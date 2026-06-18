import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRedeemGiftCode, useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Gift as GiftIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const giftSchema = z.object({
  code: z.string().min(5, "Invalid code format").toUpperCase(),
});

type GiftFormValues = z.infer<typeof giftSchema>;

export default function Gift() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<GiftFormValues>({
    resolver: zodResolver(giftSchema),
    defaultValues: { code: "" },
  });

  const redeemCode = useRedeemGiftCode();

  const onSubmit = (data: GiftFormValues) => {
    redeemCode.mutate(
      { data },
      {
        onSuccess: (res) => {
          toast({
            title: "Reward Claimed",
            description: `Successfully redeemed $${res.reward_amount.toFixed(2)}`,
          });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: (err: any) => {
          toast({
            title: "Invalid Code",
            description: err?.data?.error || "This gift code is invalid or expired",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <MobileLayout title="REWARDS">
      <div className="p-4 space-y-6">
        
        <Card className="border-primary/30 bg-card overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-[50px] pointer-events-none" />
          <CardContent className="p-8 text-center relative z-10">
            <div className="mx-auto h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
              <GiftIcon className="h-10 w-10 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-wider mb-2">Redeem Code</h2>
            <p className="text-sm text-muted-foreground mb-8">Enter your promotional code to claim account balance rewards.</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          placeholder="TESLA-XXXXXX" 
                          className="bg-background border-border/50 h-14 text-center text-lg font-display tracking-widest uppercase focus-visible:ring-primary" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-14 font-display font-bold tracking-wider text-lg bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
                  disabled={redeemCode.isPending || !form.watch("code")}
                >
                  {redeemCode.isPending ? "VERIFYING..." : "CLAIM REWARD"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

      </div>
    </MobileLayout>
  );
}
