/**
 * Autenticación servidor-a-servidor compartida por los endpoints que llaman
 * los juegos externos (`/api/rooms/[code]/result`, `/api/games/[slug]/...`).
 *
 * Se aceptan varios secretos a la vez (`HUB_RESULT_SECRET`, `_2`, `_3`, ...)
 * para poder dar de alta un juego nuevo sin rotar el secreto de todos los
 * demás — útil sobre todo cuando el original quedó marcado "sensitive" en
 * Vercel y ya no se puede leer para copiarlo a otro proyecto.
 */
export function autorizadoServidorAServidor(request: Request): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const secretos = [
    process.env.HUB_RESULT_SECRET,
    process.env.HUB_RESULT_SECRET_2,
    process.env.HUB_RESULT_SECRET_3,
  ];
  return secretos.some((s) => s && auth === `Bearer ${s}`);
}
