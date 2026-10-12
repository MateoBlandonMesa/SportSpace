type PlaceholderPageProps = {
  title: string;
  nextBranch: string;
};

export function PlaceholderPage({ title, nextBranch }: PlaceholderPageProps) {
  return (
    <section>
      <h1>{title}</h1>
      <p className="muted">Pantalla pendiente. Mateo la implementa en {nextBranch}.</p>
    </section>
  );
}
