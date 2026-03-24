import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
        404
      </p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">
        This page could not be found.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
        The page may have moved, or the resource may no longer exist in your workspace.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
