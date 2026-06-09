"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <p className="text-5xl font-bold text-text-muted/30">!</p>
      <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
      <p className="text-sm text-text-muted max-w-md">{error.message || "An unexpected error occurred."}</p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
