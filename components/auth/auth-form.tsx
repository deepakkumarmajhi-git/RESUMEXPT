"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import type { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getApiErrorMessage,
  readApiPayload,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, signupSchema } from "@/lib/validations";

type AuthFormProps = {
  mode: "login" | "signup";
  callbackUrl?: string;
};

type AuthFormFields = "name" | "email" | "password";
type AuthFormErrors = Partial<Record<AuthFormFields, string>>;

function firstString(value: unknown) {
  return Array.isArray(value) && typeof value[0] === "string"
    ? value[0]
    : undefined;
}

function fieldErrorsFromZodError(error: z.ZodError): AuthFormErrors {
  const fieldErrors = error.flatten().fieldErrors as Record<string, unknown>;

  return {
    name: firstString(fieldErrors.name),
    email: firstString(fieldErrors.email),
    password: firstString(fieldErrors.password),
  };
}

function fieldErrorsFromPayload(details: unknown): AuthFormErrors {
  if (!details || typeof details !== "object" || !("fieldErrors" in details)) {
    return {};
  }

  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") {
    return {};
  }

  return {
    name: firstString((fieldErrors as Record<string, unknown>).name),
    email: firstString((fieldErrors as Record<string, unknown>).email),
    password: firstString((fieldErrors as Record<string, unknown>).password),
  };
}

function firstErrorMessage(errors: AuthFormErrors) {
  return errors.name ?? errors.email ?? errors.password;
}

export function AuthForm({ mode, callbackUrl = "/dashboard" }: AuthFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<AuthFormErrors>({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const isSignup = mode === "signup";
  const updateField = (field: AuthFormFields, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const schema = isSignup ? signupSchema : loginSchema;
      const parsed = schema.safeParse(
        isSignup
          ? {
              name: form.name,
              email: form.email,
              password: form.password,
            }
          : {
              email: form.email,
              password: form.password,
            },
      );

      if (!parsed.success) {
        const nextErrors = fieldErrorsFromZodError(parsed.error);
        setErrors(nextErrors);
        throw new Error(firstErrorMessage(nextErrors) || "Invalid form values.");
      }

      if (isSignup) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.data),
        });

        const result = await readApiPayload<{
          id: string;
          name: string;
          email: string;
        }>(response);
        if (!response.ok) {
          const nextErrors = fieldErrorsFromPayload(result.payload?.details);
          if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
          }

          throw new Error(
            firstErrorMessage(nextErrors) ||
              getApiErrorMessage(
                response,
                result.rawText,
                result.payload,
                "Signup failed.",
              ),
          );
        }
      }

      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error("Invalid credentials. Please try again.");
      }

      toast.success(
        isSignup ? "Account created successfully." : "Welcome back.",
      );
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-3xl">
          {isSignup ? "Create your account" : "Welcome back"}
        </CardTitle>
        <CardDescription>
          {isSignup
            ? "Start analyzing resumes, generating role-specific question sets, and practicing mock interviews."
            : "Sign in to access your dashboard, uploads, and interview history."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit}>
          {isSignup ? (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                aria-invalid={Boolean(errors.name)}
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Deepak Kumar"
                required
              />
              {errors.name ? (
                <p className="text-sm text-destructive">{errors.name}</p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="you@example.com"
              required
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              aria-invalid={Boolean(errors.password)}
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              minLength={8}
              placeholder={
                isSignup
                  ? "8+ chars, uppercase, lowercase, number"
                  : "At least 8 characters"
              }
              required
            />
            {isSignup ? (
              <p className="text-sm text-muted-foreground">
                Use at least 8 characters with an uppercase letter, a lowercase
                letter, and a number.
              </p>
            ) : null}
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : null}
          </div>

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSignup ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-semibold text-primary"
          >
            {isSignup ? "Sign in" : "Create one"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
