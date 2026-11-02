export default function Loading() {
  return (
    <main
      className="page-container"
      aria-busy="true"
      aria-label="Loading championship"
    >
      <div className="skeleton" style={{ height: 390 }} />
      <div className="skeleton" />
      <div className="skeleton" />
    </main>
  );
}
