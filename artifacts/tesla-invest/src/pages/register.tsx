import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was the name of your first school?",
  "What is your mother's maiden name?",
  "What was the make of your first car?",
  "What is the name of the street you grew up on?",
  "What was your childhood nickname?",
  "What is your oldest sibling's middle name?",
  "What was the name of your favorite childhood friend?",
  "What was the first concert you attended?",
];

const registerSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  referral_code: z.string().optional(),
  security_question_1: z.string().min(1, "Please select a security question"),
  security_answer_1: z.string().min(2, "Answer must be at least 2 characters"),
  security_question_2: z.string().min(1, "Please select a second security question"),
  security_answer_2: z.string().min(2, "Answer must be at least 2 characters"),
}).refine(d => d.security_question_1 !== d.security_question_2, {
  message: "Please choose two different security questions",
  path: ["security_question_2"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setToken } = useAuth();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      referral_code: "",
      security_question_1: "",
      security_answer_1: "",
      security_question_2: "",
      security_answer_2: "",
    },
  });

  const watchQ1 = form.watch("security_question_1");

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: data.full_name,
          email: data.email,
          password: data.password,
          referral_code: data.referral_code || undefined,
          security_question_1: data.security_question_1,
          security_answer_1: data.security_answer_1,
          security_question_2: data.security_question_2,
          security_answer_2: data.security_answer_2,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Registration Failed", description: json.error || "Could not register account", variant: "destructive" });
        return;
      }
      setToken(json.token);
      toast({ title: "Account Created", description: "Welcome to Tesla Invest!" });
      setLocation("/");
    } catch {
      toast({ title: "Registration Failed", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  const isPending = form.formState.isSubmitting;

  return (
    <div className="flex min-h-screen max-w-[430px] mx-auto flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[140%] h-[60%] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-8 py-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_30px_rgba(204,0,0,0.5)]">
            <span className="font-display text-4xl font-bold">T</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-white">TESLA INVEST</h1>
          <p className="mt-2 text-sm text-muted-foreground uppercase tracking-widest">Create Portfolio</p>
        </div>

        <div className="mb-6 flex rounded-md bg-card/50 p-1 backdrop-blur-sm border border-border">
          <Link href="/login" className="flex-1 py-2 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-white">
            SIGN IN
          </Link>
          <Link href="/register" className="flex-1 rounded bg-background py-2 text-center text-sm font-medium shadow-sm">
            REGISTER
          </Link>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="full_name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" className="bg-card/50 border-border/50 h-11 focus-visible:ring-primary/50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" className="bg-card/50 border-border/50 h-11 focus-visible:ring-primary/50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" className="bg-card/50 border-border/50 h-11 focus-visible:ring-primary/50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="referral_code" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Referral Code (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="E.g. TESLA123" className="bg-card/50 border-border/50 h-11 focus-visible:ring-primary/50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="pt-2 pb-1">
              <p className="text-xs uppercase tracking-wider text-primary font-medium">Security Questions</p>
              <p className="text-xs text-muted-foreground mt-1">Used to recover your account if you forget your password.</p>
            </div>

            <FormField control={form.control} name="security_question_1" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Security Question 1</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-card/50 border-border/50 h-11 focus:ring-primary/50">
                      <SelectValue placeholder="Select a question" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SECURITY_QUESTIONS.map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="security_answer_1" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Answer 1</FormLabel>
                <FormControl>
                  <Input placeholder="Your answer" className="bg-card/50 border-border/50 h-11 focus-visible:ring-primary/50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="security_question_2" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Security Question 2</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-card/50 border-border/50 h-11 focus:ring-primary/50">
                      <SelectValue placeholder="Select a different question" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SECURITY_QUESTIONS.filter(q => q !== watchQ1).map(q => (
                      <SelectItem key={q} value={q}>{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="security_answer_2" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Answer 2</FormLabel>
                <FormControl>
                  <Input placeholder="Your answer" className="bg-card/50 border-border/50 h-11 focus-visible:ring-primary/50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button
              type="submit"
              className="w-full h-12 mt-4 font-display font-bold tracking-wider text-md bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
              disabled={isPending}
            >
              {isPending ? "PROCESSING..." : "CREATE PORTFOLIO"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
