ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "match_participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "games" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "games" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "games" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
)) WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "games" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "match_participants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "match_participants" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "match_participants" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
)) WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "match_participants" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "matches" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "matches" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "matches" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
)) WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "matches" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "profiles"."id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "profiles"."id")) WITH CHECK ((select auth.user_id() = "profiles"."id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "profiles"."id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "user_games" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "user_games"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "user_games" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "user_games" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
)) WITH CHECK ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "user_games" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((
  select exists (
    select 1 from profiles p
    where p.id = (select auth.user_id()) and p.is_admin = true
  )
));--> statement-breakpoint
-- Privilegios para los roles de la Data API de Neon (authenticated / anonymous).
-- RLS sigue mandando: estos GRANT solo abren la "puerta", las políticas deciden las filas.
-- Se ejecutan solo si los roles existen (Neon los crea al habilitar la Data API),
-- así esta migración no falla si la Data API aún no está activada.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anonymous') THEN
    -- El anónimo solo "ve" el esquema; no tiene privilegios de tabla y RLS lo bloquea.
    GRANT USAGE ON SCHEMA public TO anonymous;
  END IF;
END $$;