import { Skeleton } from "@/components/ui/skeleton";

export function AISummarySkeleton() {
  return (
    <div className="space-y-2 pt-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
    </div>
  );
}
