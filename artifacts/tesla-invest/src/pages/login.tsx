import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const login = useLogin();

  const onSubmit = (data: LoginFormValues) => {
    login.mutate(
      { data },
      {
        onSuccess: (res) => {
          setToken(res.token);
          toast({
            title: "Access Granted",
            description: "Welcome to Tesla Invest.",
          });
          setLocation("/");
        },
        onError: (err: any) => {
          toast({
            title: "Access Denied",
            description: err?.data?.error || "Invalid credentials",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen max-w-[430px] mx-auto flex-col bg-background relative overflow-hidden">
      {/* Abstract Tech Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[140%] h-[60%] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-8 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(204,0,0,0.5)]">
            <span className="font-display text-4xl font-bold">T</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-white">TESLA INVEST</h1>
          <p className="mt-2 text-sm text-muted-foreground uppercase tracking-widest">Premium Portfolio</p>
        </div>

        <div className="mb-8 flex rounded-md bg-card/50 p-1 backdrop-blur-sm border border-border">
          <Link href="/login" className="flex-1 rounded bg-background py-2 text-center text-sm font-medium shadow-sm">
            SIGN IN
          </Link>
          <Link href="/register" className="flex-1 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-white">
            REGISTER
          </Link>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your email" className="bg-card/50 border-border/50 h-12 focus-visible:ring-primary/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot?
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="bg-card/50 border-border/50 h-12 focus-visible:ring-primary/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-12 mt-4 font-display font-bold tracking-wider text-md bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
              disabled={login.isPending}
            >
              {login.isPending ? "AUTHENTICATING..." : "SIGN IN"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
