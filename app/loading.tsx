import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 px-4 py-8 lg:px-8">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-32 w-full rounded-[1.8rem]" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 w-full rounded-[1.8rem]" />
        <Skeleton className="h-32 w-full rounded-[1.8rem]" />
        <Skeleton className="h-32 w-full rounded-[1.8rem]" />
      </div>
    </div>
  );
}
