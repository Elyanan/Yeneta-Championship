import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="page-container">
      <div className="empty-state">
        <h1>That page is out of play.</h1>
        <p>The team, player or match may no longer be available.</p>
        <Link href="/" className="button button-primary mt-6">
          Back to the championship
        </Link>
      </div>
    </main>
  );
}
