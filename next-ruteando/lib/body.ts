/** Lee el cuerpo contando bytes y aborta al pasar `max`: no se reserva memoria para lo que se va a rechazar. `null` = demasiado grande. */
export async function readCapped(request: Request, max: number): Promise<ArrayBuffer | null> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > max) return null;
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out.buffer;
}
