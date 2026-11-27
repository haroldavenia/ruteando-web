/**
 * Datos estructurados (JSON-LD) en una etiqueta de datos, no de código: la CSP no la bloquea. El `<` se escapa para que un texto no pueda
 * cerrar la etiqueta.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
