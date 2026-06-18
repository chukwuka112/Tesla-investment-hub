import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useVerifyOtp, useResendOtp } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const verifySchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyOtp() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  const email = sessionStorage.getItem("verify_email");
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) {
      setLocation("/login");
    }
  }, [email, setLocation]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [countdown]);

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      otp: "",
    },
  });

  const verifyOtp = useVerifyOtp();
  const resendOtp = useResendOtp();

  const onSubmit = (data: VerifyFormValues) => {
    if (!email) return;
    
    verifyOtp.mutate(
      { data: { email, otp: data.otp } },
      {
        onSuccess: (res) => {
          setToken(res.token);
          sessionStorage.removeItem("verify_email");
          toast({
            title: "Verification Successful",
            description: "Your account is now active.",
          });
          setLocation("/");
        },
        onError: (err: any) => {
          toast({
            title: "Verification Failed",
            description: err?.data?.error || "Invalid OTP code",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleResend = () => {
    if (!email || countdown > 0) return;
    
    resendOtp.mutate(
      { data: { email } },
      {
        onSuccess: () => {
          setCountdown(60);
          toast({
            title: "Code Sent",
            description: "A new verification code has been sent to your email.",
          });
        },
        onError: (err: any) => {
          toast({
            title: "Failed to resend",
            description: err?.data?.error || "Could not resend code",
            variant: "destructive",
          });
        },
      }
    );
  };

  if (!email) return null;

  return (
    <div className="flex min-h-screen max-w-[430px] mx-auto flex-col bg-background px-6 py-8">
      <button 
        onClick={() => setLocation("/register")}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-white mb-8"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-wider text-white mb-3">SECURITY<br/>VERIFICATION</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit security code sent to<br/>
          <span className="font-medium text-white">{email}</span>
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <FormControl>
                  <InputOTP maxLength={6} {...field}>
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="h-12 w-12 sm:h-14 sm:w-14 rounded-md border-border bg-card/50 text-xl font-display font-bold" />
                      <InputOTPSlot index={1} className="h-12 w-12 sm:h-14 sm:w-14 rounded-md border-border bg-card/50 text-xl font-display font-bold" />
                      <InputOTPSlot index={2} className="h-12 w-12 sm:h-14 sm:w-14 rounded-md border-border bg-card/50 text-xl font-display font-bold" />
                      <InputOTPSlot index={3} className="h-12 w-12 sm:h-14 sm:w-14 rounded-md border-border bg-card/50 text-xl font-display font-bold" />
                      <InputOTPSlot index={4} className="h-12 w-12 sm:h-14 sm:w-14 rounded-md border-border bg-card/50 text-xl font-display font-bold" />
                      <InputOTPSlot index={5} className="h-12 w-12 sm:h-14 sm:w-14 rounded-md border-border bg-card/50 text-xl font-display font-bold" />
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full h-12 font-display font-bold tracking-wider text-md bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
            disabled={verifyOtp.isPending || form.watch("otp").length !== 6}
          >
            {verifyOtp.isPending ? "VERIFYING..." : "VERIFY CODE"}
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">Didn't receive the code?</p>
        <button 
          onClick={handleResend}
          disabled={countdown > 0 || resendOtp.isPending}
          className="text-sm font-medium text-primary hover:underline disabled:text-muted-foreground disabled:hover:no-underline"
        >
          {countdown > 0 ? `Resend available in ${countdown}s` : "Resend Code"}
        </button>
      </div>
    </div>
  );
}
