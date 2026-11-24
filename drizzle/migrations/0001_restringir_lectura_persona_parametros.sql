DROP POLICY IF EXISTS "leer" ON public.persona;
CREATE POLICY "staff o propia" ON public.persona FOR SELECT TO authenticated USING (public.es_staff() OR id = public.persona_actual());
DROP POLICY IF EXISTS "leer" ON public.no_disponible;
CREATE POLICY "staff o propia" ON public.no_disponible FOR SELECT TO authenticated USING (public.es_staff() OR persona_id = public.persona_actual());
DROP POLICY IF EXISTS "leer" ON public.parametros;
CREATE POLICY "staff" ON public.parametros FOR SELECT TO authenticated USING (public.es_staff());

CREATE OR REPLACE FUNCTION public.equipo_alias()
RETURNS TABLE(id text, alias text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT p.id, p.alias FROM public.persona p WHERE auth.uid() IS NOT NULL ORDER BY p.alias $$;
REVOKE ALL ON FUNCTION public.equipo_alias() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.equipo_alias() TO authenticated;