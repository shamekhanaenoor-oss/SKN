REVOKE EXECUTE ON FUNCTION public.generate_next_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_next_id(text) TO service_role;