# 🎲 Hub de Juegos en Familia

Puerta de entrada única para los juegos por turnos de la familia (≤15 personas,
repartidas entre España, Argentina y Rep. Dominicana). Se encarga de:

1. **Identidad y acceso** — login, invitaciones, contraseñas (Neon Auth).
2. **Permisos** — quién puede entrar a cada juego.
3. **Estadísticas** — partidas, victorias/derrotas/empates, prácticas, rankings y
   enfrentamientos cara a cara.

Este hub es la **fuente de verdad única**: más adelante cada juego externo leerá
la sesión de Neon Auth y escribirá aquí sus resultados (ver
[`INTEGRACION-JUEGOS.md`](./INTEGRACION-JUEGOS.md)).

## Stack

- **Next.js 16** (App Router) + **TypeScript**, desplegado en **Vercel**.
- **Neon Postgres** (la integración de Vercel inyecta `DATABASE_URL`).
- **Neon Auth** (Better Auth): email + contraseña, reset, plugin Admin.
- **Drizzle ORM** para esquema y migraciones.
- **RLS de Postgres** + **Data API de Neon** (PostgREST) preparada para los juegos.
- UI en español, mobile-first. Sin realtime (los juegos son por turnos).

---

## Puesta en marcha (local)

### 1. Dependencias

```bash
npm install
```

### 2. Proyecto Neon + Neon Auth

1. Crea un proyecto en [Neon](https://neon.tech) (o usa la integración de Vercel).
2. Habilita **Neon Auth** en el proyecto y activa **Sign-up with Email**.
   La forma rápida de generar credenciales y configuración:
   ```bash
   npx neonctl@latest init
   ```
3. Habilita la **Data API** del proyecto (necesaria para que los juegos externos
   lean/escriban más adelante). Esto crea los roles `authenticated` / `anonymous`.

### 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Cadena "pooled" del panel de Neon (en Vercel la inyecta la integración). |
| `NEON_AUTH_BASE_URL` | Panel de Neon Auth / `neonctl init`. |
| `NEON_AUTH_COOKIE_SECRET` | Genera 32+ bytes: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (para enlaces de los correos). |
| `NEXT_PUBLIC_NEON_DATA_API_URL` | URL de la Data API del proyecto. |
| `ADMIN_EMAILS` | Email(s) del/los primer(os) admin(s), separados por comas. |

### 4. Migraciones

Aplica el esquema + las políticas RLS:

```bash
npm run db:migrate
```

> Genera nuevas migraciones tras tocar `src/db/schema.ts` con `npm run db:generate`.
> `npm run db:push` empuja el esquema rápido pero **no** ejecuta los GRANT de la
> Data API que sí incluye la migración `0001_rls`; para producción usa `db:migrate`.

### 5. SMTP propio (Gmail) para los correos

Los correos de invitación y de "recuperar contraseña" los envía **Neon Auth**, no
la app. Configura tu Gmail como servidor SMTP del proyecto:

1. En tu cuenta de Google: activa la verificación en 2 pasos y crea una
   **Contraseña de aplicación** (16 caracteres).
2. Configúralo en Neon Auth, por cualquiera de estas vías:
   - **Consola de Neon** → Proyecto → *Auth* → *Email / SMTP*: host `smtp.gmail.com`,
     puerto `465` (SSL), usuario tu email, contraseña la de aplicación, y el
     remitente (`sender_email` / `sender_name`).
   - **API de Neon** (`PATCH` de la configuración de email/password de Neon Auth),
     con los campos `host`, `port`, `username`, `password`, `sender_email`,
     `sender_name`. Ver la referencia de la API de Neon
     (*Update email and password configuration*).

> Sin SMTP propio, Neon Auth usa un remitente compartido (`noreply@stackframe.co`),
> poco fiable para correos reales a la familia.

### 6. Primer administrador

No hay registro abierto. Para crear el primer admin:

1. Inicia sesión **una vez** con tu email (`ADMIN_EMAILS`). Si aún no tienes
   contraseña, usa "He olvidado mi contraseña" para ponértela.
2. Ejecuta el seed, que te marca como admin (y crea juegos de ejemplo):
   ```bash
   npm run seed
   ```
   Si el seed no pudo fijar el rol en Neon Auth, ponlo a mano en la Consola
   (usuario → rol `admin`). A partir de ahí, invita al resto desde `/admin/usuarios`.

### 7. Arrancar

```bash
npm run dev
```

Abre <http://localhost:3000>.

---

## Despliegue en Vercel

1. Sube el repo a GitHub e impórtalo en Vercel.
2. Añade la **integración de Neon** en el proyecto de Vercel: inyecta
   `DATABASE_URL` automáticamente en todos los entornos.
3. Configura el resto de variables (`NEON_AUTH_BASE_URL`,
   `NEON_AUTH_COOKIE_SECRET`, `NEXT_PUBLIC_APP_URL`,
   `NEXT_PUBLIC_NEON_DATA_API_URL`, `ADMIN_EMAILS`) en *Settings → Environment Variables*.
4. Aplica migraciones contra la base de producción (con su `DATABASE_URL`):
   ```bash
   npm run db:migrate
   ```
5. Deploy. Tras el primer login, ejecuta `npm run seed` apuntando a producción
   para crear el primer admin.

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo. |
| `npm run build` / `start` | Build y arranque de producción. |
| `npm run typecheck` | Comprueba tipos. |
| `npm run db:generate` | Genera migraciones desde `src/db/schema.ts`. |
| `npm run db:migrate` | Aplica migraciones (incluye RLS y GRANTs). |
| `npm run db:push` | Empuja el esquema directo (dev rápido). |
| `npm run db:studio` | Explorador de la base de datos. |
| `npm run seed` | Marca el primer admin y crea juegos de ejemplo. |

---

## Estructura

```
src/
  db/            esquema Drizzle, cliente y consultas (juegos, stats, admin)
  auth/          servidor/cliente de Neon Auth, helpers de sesión, i18n
  actions/       Server Actions (perfil, admin: invitar, juegos, permisos, partidas)
  components/    UI reutilizable y formularios cliente
  app/
    (auth)/      login, recuperar, restablecer (públicas)
    (app)/       hub, estadísticas, perfil, cambiar-password, admin (protegidas)
    api/auth/    handler de Neon Auth
  proxy.ts       protección de rutas (antiguo "middleware")
drizzle/         migraciones SQL
scripts/seed.ts  bootstrap del primer admin
```

## Seguridad

- Nunca subas `.env.local` ni credenciales (está en `.gitignore`).
- Las RLS protegen el acceso vía Data API; las Server Actions del panel usan la
  conexión privilegiada tras comprobar el rol admin.
- El flag de admin vive en `profiles.is_admin` (autorización de la app) y se
  mantiene en sincronía con el rol `admin` de Neon Auth (necesario para invitar).
