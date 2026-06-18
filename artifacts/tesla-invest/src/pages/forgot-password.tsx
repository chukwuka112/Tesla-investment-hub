import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const answersSchema = z.object({
  answer_1: z.string().min(1, "Answer is required"),
  answer_2: z.string().min(1, "Answer is required"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type AnswersFormValues = z.infer<typeof answersSchema>;

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "questions">("email");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<{ question_1: string; question_2: string } | null>(null);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const answersForm = useForm<AnswersFormValues>({
    resolver: zodResolver(answersSchema),
    defaultValues: { answer_1: "", answer_2: "" },
  });

  const onEmailSubmit = async (data: EmailFormValues) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Not Found", description: json.error || "Could not find account", variant: "destructive" });
        return;
      }
      setEmail(data.email);
      setQuestions({ question_1: json.question_1, question_2: json.question_2 });
      setStep("questions");
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  const onAnswersSubmit = async (data: AnswersFormValues) => {
    try {
      const res = await fetch("/api/auth/verify-security-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answer_1: data.answer_1, answer_2: data.answer_2 }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Incorrect Answers", description: json.error || "Answers do not match", variant: "destructive" });
        return;
      }
      sessionStorage.setItem("reset_token", json.reset_token);
      toast({ title: "Verified!", description: "Please set your new password." });
      setLocation("/reset-password");
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen max-w-[430px] mx-auto flex-col bg-background px-6 py-8">
      <button
        onClick={() => step === "questions" ? setStep("email") : setLocation("/login")}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-white mb-8"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {step === "email" ? (
        <>
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold tracking-wider text-white mb-3">RECOVER<br/>ACCESS</h1>
            <p className="text-sm text-muted-foreground">
              Enter your registered email to retrieve your security questions.
            </p>
          </div>

          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
              <FormField control={emailForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider text-muted-foreground">Registered Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your email" className="bg-card/50 border-border/50 h-12 focus-visible:ring-primary/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button
                type="submit"
                className="w-full h-12 font-display font-bold tracking-wider text-md bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting ? "SEARCHING..." : "CONTINUE"}
              </Button>
            </form>
          </Form>
        </>
      ) : (
        <>
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold tracking-wider text-white mb-3">SECURITY<br/>QUESTIONS</h1>
            <p className="text-sm text-muted-foreground">
              Answer your security questions to reset your password.
            </p>
          </div>

          <Form {...answersForm}>
            <form onSubmit={answersForm.handleSubmit(onAnswersSubmit)} className="space-y-6">
              {questions && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Question 1</p>
                    <p className="text-sm font-medium text-white bg-card/50 border border-border/50 rounded-md px-4 py-3">
                      {questions.question_1}
                    </p>
                    <FormField control={answersForm.control} name="answer_1" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Your answer" className="bg-card/50 border-border/50 h-12 focus-visible:ring-primary/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Question 2</p>
                    <p className="text-sm font-medium text-white bg-card/50 border border-border/50 rounded-md px-4 py-3">
                      {questions.question_2}
                    </p>
                    <FormField control={answersForm.control} name="answer_2" render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Your answer" className="bg-card/50 border-border/50 h-12 focus-visible:ring-primary/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </>
              )}

              <Button
                type="submit"
                className="w-full h-12 font-display font-bold tracking-wider text-md bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(204,0,0,0.3)] transition-all"
                disabled={answersForm.formState.isSubmitting}
              >
                {answersForm.formState.isSubmitting ? "VERIFYING..." : "VERIFY ANSWERS"}
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
