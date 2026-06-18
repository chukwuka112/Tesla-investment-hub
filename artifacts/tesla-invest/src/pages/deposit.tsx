import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateDeposit, DepositInitResponse } from "@workspace/api-client-react";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, CheckCircle2, QrCode } from "lucide-react";

const depositSchema = z.object({
  amount: z.coerce.number().min(10, "Minimum deposit is $10"),
  currency: z.string().min(1, "Please select a currency"),
});

type DepositFormValues = z.infer<typeof depositSchema>;

export default function Deposit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [depositData, setDepositData] = useState<DepositInitResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: 100,
      currency: "USDT_TRC20",
    },
  });

  const createDeposit = useCreateDeposit();

  const onSubmit = (data: DepositFormValues) => {
    createDeposit.mutate(
      { data },
      {
        onSuccess: (res) => {
          setDepositData(res);
        },
        onError: (err: any) => {
          toast({
            title: "Deposit Failed",
            description: err?.data?.error || "Could not initiate deposit",
            variant: "destructive",
          });
        },
      }
    );
  };

  const copyToClipboard = () => {
    if (!depositData?.payment_address) return;
    navigator.clipboard.writeText(depositData.payment_address);
    setCopied(true);
    toast({
      title: "Copied",
      description: "Payment address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MobileLayout title="FUND ACCOUNT">
      <div className="p-4 space-y-6">
        {!depositData && (
          <button 
            onClick={() => setLocation("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {!depositData ? (
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <h2 className="font-display text-xl font-bold uppercase tracking-wider mb-6">Initiate Transfer</h2>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Amount (USD)</FormLabel>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Network / Asset</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-background border-border/50 h-14">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USDT_TRC20">USDT (TRC20)</SelectItem>
                            <SelectItem value="USDT_ERC20">USDT (ERC20)</SelectItem>
                            <SelectItem value="USDC_ERC20">USDC (ERC20)</SelectItem>
                            <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                            <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full h-14 mt-4 font-display font-bold tracking-wider text-lg bg-primary hover:bg-primary/90 text-white transition-all"
                    disabled={createDeposit.isPending}
                  >
                    {createDeposit.isPending ? "GENERATING..." : "GENERATE ADDRESS"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <QrCode className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold uppercase tracking-wider">Awaiting Payment</h2>
              <p className="text-sm text-muted-foreground mt-2">Send exactly <strong className="text-white">${depositData.amount.toFixed(2)}</strong> via {depositData.currency}</p>
            </div>

            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                {/* QR Code Placeholder */}
                <div className="mx-auto w-48 h-48 bg-white p-2 rounded-xl mb-6 flex items-center justify-center">
                  <div className="w-full h-full border-4 border-dashed border-gray-300 flex items-center justify-center">
                    <span className="text-xs text-gray-400 font-display">SCAN QR</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground text-center">Payment Address</p>
                  <div className="flex items-center gap-2 bg-background p-3 rounded-md border border-border">
                    <code className="text-xs break-all flex-1">{depositData.payment_address}</code>
                    <button 
                      onClick={copyToClipboard}
                      className="p-2 bg-card rounded hover:bg-white/10 transition-colors shrink-0"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg bg-card border border-border p-4 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>Send only {depositData.currency} to this address.</li>
                <li>Your balance will update automatically after network confirmations.</li>
                <li>Do not save this address for future deposits.</li>
              </ul>
            </div>

            <Button 
              onClick={() => setLocation("/transactions")}
              variant="outline"
              className="w-full h-12 font-display tracking-widest uppercase"
            >
              VIEW STATUS
            </Button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
