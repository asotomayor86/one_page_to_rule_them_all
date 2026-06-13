# Integración de juegos externos con el Hub

Esta guía explica cómo un juego desplegado por separado (en Vercel u otro sitio)
se conecta al hub para: **(1)** entrar por una **sala** creada en el hub, **(2)**
saber qué jugador es, **(3)** comprobar acceso y **(4)** escribir el resultado.

El hub usa **Neon Auth** (sesión/JWT) y la **Data API de Neon** (PostgREST sobre
HTTPS) sobre la misma base de datos Postgres. Las tablas relevantes viven en el
esquema `public`: `profiles`, `games`, `user_games`, `rooms`, `room_players`,
`matches`, `match_participants`.

**Flujo general:** en el hub se crea una **sala** (juego + jugadores) y se obtiene
un **código**. El hub abre el juego en `URL_DEL_JUEGO?sala=CÓDIGO`. El juego
consulta la sala al hub por ese código, identifica al jugador con Neon Auth y solo
sienta a quienes están en la lista de la sala. Al terminar, escribe el resultado.

---

## 1. Variables de entorno del juego

```bash
# Cliente (público)
HUB_URL=https://one-page-to-rule-them-all.vercel.app     # el hub (para /api/rooms)
NEON_AUTH_BASE_URL=https://tu-proyecto.neon.tech         # MISMO proyecto Neon Auth que el hub

# Solo en el BACKEND del juego
HUB_RESULT_SECRET=...                                    # secreto compartido para devolver resultados
NEON_AUTH_COOKIE_SECRET=...                              # 32+ chars, propio del juego

# Opcionales (solo si escribes resultados por Data API/SQL en vez de por el hub)
NEON_DATA_API_URL=https://app-xxxx.dataapi.neon.tech/rest/v1
GAME_SERVICE_DATABASE_URL=postgresql://...               # conexión privilegiada (no exponer)
```

> **Clave del SSO:** usa el **mismo `NEON_AUTH_BASE_URL`** que el hub. Así las
> cuentas (email+contraseña) del hub funcionan en el juego sin login propio.
> `HUB_RESULT_SECRET` te lo da el administrador del hub (es su variable de entorno).

---

## 0. Login en el juego (mismo Neon Auth que el hub)

El juego es un cliente del **mismo proyecto Neon Auth**. Configúralo igual que el
hub (ver su README): instala `@neondatabase/auth`, crea el cliente/servidor con
`NEON_AUTH_BASE_URL`, expón `/api/auth/[...path]` y usa el formulario de login
(`<SignInForm>`), o `auth.signIn.email(...)`. Como el juego vive en otro dominio,
la sesión del hub no viaja: **el juego pide login (email+contraseña)**, que es lo
deseado. Tras iniciar sesión, `getSession()` te da `user.id` (= `sub`).

---

## 1.5. Entrar por una sala (el punto de entrada)

El hub abre tu juego con el código en la URL:

```
https://tu-juego.vercel.app/?sala=ABC234
```

**Paso 1 — lee el código** del query param `sala`.

**Paso 2 — pide la sala al hub** (el código actúa de llave; no necesita auth):

```ts
const code = new URLSearchParams(location.search).get("sala");
const res = await fetch(`${HUB_URL}/api/rooms/${code}`);
if (!res.ok) throw new Error("Sala no válida o caducada");
const sala = await res.json();
// {
//   code: "ABC234",
//   status: "open",
//   game: { slug, name, url },
//   players: [ { userId, name, role: "player" | "spectator" }, ... ]
// }
```

**Paso 3 — identifica al jugador con Neon Auth** (sección 2) y **comprueba que
está en la sala** antes de darle su sitio:

```ts
const userId = await getUserIdFromSession(); // sub del JWT de Neon Auth
const asiento = sala.players.find((p) => p.userId === userId && p.role === "player");
if (!asiento) {
  // No es jugador de esta sala. (En el futuro podrás permitir 'spectator'.)
  throw new Error("No tienes sitio en esta sala");
}
// Sienta al jugador. La lista `players` define quiénes pueden ocupar asiento.
```

> Seguridad: el código abre la lista de jugadores, pero **quién ocupa un asiento
> lo decide la identidad de Neon Auth**, no el código. Valida siempre el `userId`
> del jugador logueado contra `sala.players`. Más adelante, los usuarios del hub
> que no sean jugadores podrán entrar como `spectator`.

---

## 2. Identificar al jugador (validar la sesión / JWT)

El navegador del jugador ya tiene sesión de Neon Auth (cookies del hub si
compartís dominio/subdominio, o un token que el hub le pasa). En el cliente puedes
obtener el JWT con el SDK de Neon Auth:

```ts
import { createAuthClient } from "@neondatabase/auth/next";
const authClient = createAuthClient();
const token = await authClient.getJWTToken(); // JWT para la Data API
```

En el **servidor del juego**, valida ese JWT contra el JWKS de Neon Auth y lee el
`sub` (que es el id de usuario, el mismo que `profiles.id`):

```ts
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));

export async function getUserIdFromToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, JWKS);
  if (!payload.sub) throw new Error("Token sin 'sub'");
  return payload.sub; // == profiles.id
}
```

---

## 3. Comprobar que el jugador tiene acceso al juego

Con el JWT del jugador, la **Data API** aplica RLS automáticamente: `user_games`
solo devuelve **sus** filas. Para comprobar el acceso a un juego por `slug`:

```ts
async function tieneAcceso(token: string, slug: string): Promise<boolean> {
  const url = new URL(`${process.env.NEON_DATA_API_URL}/user_games`);
  // PostgREST: embebemos games y filtramos por su slug
  url.searchParams.set("select", "game_id,games!inner(slug)");
  url.searchParams.set("games.slug", `eq.${slug}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const filas = (await res.json()) as unknown[];
  return filas.length > 0; // RLS garantiza que solo son las del propio usuario
}
```

---

## 4. Escribir el resultado de una partida (el contrato)

Una partida = **1 fila en `matches`** (cabecera) + **N filas en
`match_participants`** (una por jugador).

El resultado lo escribe el **BACKEND del juego** (no el navegador), para que un
jugador no pueda falsearlo.

### 4·0. Recomendado: devolver el resultado al hub

La forma más sencilla y que encaja con las salas: el backend del juego hace un
`POST` al hub. El hub valida que los jugadores pertenecen a la sala, escribe la
partida en estadísticas y **cierra la sala**. El juego no necesita acceso a la BD.

```http
POST {HUB_URL}/api/rooms/{CÓDIGO}/result
Authorization: Bearer {HUB_RESULT_SECRET}
Content-Type: application/json

{
  "kind": "ranked",                 // o "practice"
  "notes": "Final reñida",          // opcional
  "results": [
    { "userId": "user_abc", "result": "win",  "score": 21, "position": 1 },
    { "userId": "user_def", "result": "loss", "score": 14, "position": 2 }
  ]
}
```

Respuesta: `{ "ok": true, "matchId": "…" }`. Errores: `401` (secreto incorrecto),
`404` (sala no existe), `409` (sala ya cerrada), `400` (jugador fuera de la sala).

```ts
// En el backend del juego, al terminar la partida:
await fetch(`${process.env.HUB_URL}/api/rooms/${code}/result`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.HUB_RESULT_SECRET}`,
  },
  body: JSON.stringify({ kind: "ranked", results }),
});
```

> Notas: `userId` es el `sub` del JWT de cada jugador (= `profiles.id`). La sala se
> cierra tras enviar el resultado (no se puede enviar dos veces el mismo).

Si prefieres no pasar por el hub, tienes dos alternativas equivalentes:

### 4a. Vía Data API (PostgREST)

Con un token con privilegios de escritura (servicio admin), o tras aplicar la
política opcional, con el JWT del jugador:

**Paso 1 — crear la cabecera y recuperar su `id`:**

```http
POST {NEON_DATA_API_URL}/matches
Authorization: Bearer <token>
Content-Type: application/json
Prefer: return=representation

{ "game_id": "11111111-1111-1111-1111-111111111111", "kind": "ranked", "notes": "Partida del domingo" }
```

Respuesta (gracias a `Prefer: return=representation`):

```json
[{ "id": "aaaa1111-...", "game_id": "1111...", "kind": "ranked", "played_at": "2026-06-09T18:00:00Z", "notes": "Partida del domingo" }]
```

**Paso 2 — insertar los participantes (array en una sola llamada):**

```http
POST {NEON_DATA_API_URL}/match_participants
Authorization: Bearer <token>
Content-Type: application/json

[
  { "match_id": "aaaa1111-...", "user_id": "user_abc", "result": "win",  "score": 21, "position": 1 },
  { "match_id": "aaaa1111-...", "user_id": "user_def", "result": "loss", "score": 14, "position": 2 }
]
```

Notas del contrato:
- `kind`: `"ranked"` (cuenta para el ranking) o `"practice"`.
- `result`: `"win" | "loss" | "draw"`.
- `score` y `position` son opcionales (`null` si no aplica).
- `user_id` es el `sub` del JWT de cada jugador (= `profiles.id`).
- Si el paso 2 falla, borra la cabecera creada en el paso 1 para no dejar
  partidas vacías.

### 4b. Vía SQL directo (backend del juego)

```sql
WITH nueva AS (
  INSERT INTO matches (game_id, kind, notes)
  VALUES ($1, 'ranked', $2)
  RETURNING id
)
INSERT INTO match_participants (match_id, user_id, result, score, position)
SELECT nueva.id, x.user_id, x.result, x.score, x.position
FROM nueva, jsonb_to_recordset($3::jsonb)
  AS x(user_id text, result text, score int, position int);
```

Donde `$3` es un JSON como:
```json
[{"user_id":"user_abc","result":"win","score":21,"position":1},
 {"user_id":"user_def","result":"loss","score":14,"position":2}]
```

---

## 5. (Opcional) Permitir escritura desde el cliente con el JWT del jugador

Si preferís que cada juego escriba con el JWT del jugador (modelo de confianza,
sin backend), añadid esta política RLS. Permite insertar partidas **solo** de
juegos a los que el usuario tiene acceso:

```sql
-- Insertar cabeceras de partidas de juegos a los que el usuario tiene acceso
CREATE POLICY "jugador-inserta-match" ON matches
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_games ug
      WHERE ug.game_id = matches.game_id
        AND ug.user_id = (select auth.user_id())
    )
  );

-- Insertar participantes de partidas que el usuario acaba de crear
CREATE POLICY "jugador-inserta-participantes" ON match_participants
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN user_games ug ON ug.game_id = m.game_id
      WHERE m.id = match_participants.match_id
        AND ug.user_id = (select auth.user_id())
    )
  );
```

> Ten en cuenta el riesgo: con esta política un jugador podría registrar
> resultados manualmente. Para una familia suele ser aceptable; si no, usa el
> modelo de backend del apartado 4.

---

## Resumen

| Necesidad | Cómo |
|---|---|
| Entrar por una sala | Lee `?sala=CÓDIGO`, `GET {HUB_URL}/api/rooms/{CÓDIGO}` → juego + `players[]`. |
| ¿Quién es el jugador? | Identidad de Neon Auth (sesión/JWT) → `sub` = `userId` = `profiles.id`. |
| ¿Puede ocupar asiento? | El `userId` del logueado debe estar en `sala.players` con `role: "player"`. |
| ¿Tiene acceso al juego? | `GET /user_games` por Data API con su JWT (RLS filtra). |
| Devolver resultado (recomendado) | `POST {HUB_URL}/api/rooms/{CÓDIGO}/result` con `HUB_RESULT_SECRET` (cierra la sala). |
| Guardar resultado (alternativa) | `POST /matches` + `POST /match_participants` (con privilegio de escritura). |
| Separar práctica de oficial | Campo `kind` (`practice` / `ranked`). |
