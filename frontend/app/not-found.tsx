import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <p className="text-5xl font-bold text-text-muted/30">404</p>
      <h1 className="text-lg font-semibold text-text-primary">Page Not Found</h1>
      <p className="text-sm text-text-muted">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="mt-2 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
