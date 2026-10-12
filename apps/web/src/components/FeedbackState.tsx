type FeedbackStateProps = {
  title: string;
  description?: string;
};

export function LoadingState({ title, description }: FeedbackStateProps) {
  return (
    <section className="feedback-state" role="status" aria-live="polite">
      <h1>{title}</h1>
      <p className="muted">{description ?? 'Cargando…'}</p>
    </section>
  );
}

export function EmptyState({ title, description }: FeedbackStateProps) {
  return (
    <section className="feedback-state">
      <h1>{title}</h1>
      <p className="muted">{description ?? 'No hay información para mostrar todavía.'}</p>
    </section>
  );
}

export function ErrorState({ title, description }: FeedbackStateProps) {
  return (
    <section className="feedback-state" role="alert">
      <h1>{title}</h1>
      <p className="error-text">{description ?? 'Ocurrió un error inesperado.'}</p>
    </section>
  );
}
