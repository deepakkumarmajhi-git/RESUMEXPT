import { cn } from "@/utils/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-secondary/80", className)}
      {...props}
    />
  );
}

export { Skeleton };
