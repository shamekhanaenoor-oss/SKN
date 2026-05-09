CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.card_templates (
  category TEXT PRIMARY KEY,
  template JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view card templates"
ON public.card_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert card templates"
ON public.card_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update card templates"
ON public.card_templates FOR UPDATE TO authenticated USING (true);

CREATE TRIGGER update_card_templates_updated_at
BEFORE UPDATE ON public.card_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();