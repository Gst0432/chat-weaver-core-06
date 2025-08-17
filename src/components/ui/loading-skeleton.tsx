import { Skeleton } from "./skeleton";

export const MessageSkeleton = () => (
  <div className="flex justify-start">
    <div className="max-w-[80%] rounded-lg p-4 bg-card border border-border">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  </div>
);

export const CodeSkeleton = () => (
  <div className="space-y-4 p-6">
    <div className="flex space-x-4">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-16" />
    </div>
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i % 3 === 0 ? 'w-3/4' : i % 3 === 1 ? 'w-full' : 'w-1/2'}`} />
      ))}
    </div>
  </div>
);

export const PreviewSkeleton = () => (
  <div className="p-6 space-y-4">
    <div className="flex justify-center space-x-2 mb-6">
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-8 w-8 rounded" />
      <Skeleton className="h-8 w-8 rounded" />
    </div>
    <Skeleton className="h-[400px] w-full rounded-lg" />
  </div>
);