CREATE TABLE public.uniforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  gender TEXT,
  color TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.uniforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage uniforms" ON public.uniforms
FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'))
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'principal'));

CREATE POLICY "staff read uniforms" ON public.uniforms
FOR SELECT TO authenticated
USING (is_staff(auth.uid()));

CREATE TRIGGER set_updated_at_uniforms
BEFORE UPDATE ON public.uniforms
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();