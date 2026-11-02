"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main" className="page-container">
      <div className="empty-state">
        <h1>Something interrupted play.</h1>
        <p>We couldn’t load this page. Please try again.</p>
        <Button onClick={reset} className="mt-5">
          Try again
        </Button>
      </div>
    </main>
  );
}
