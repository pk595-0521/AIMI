-- User-editable metadata and profile columns must never grant portal roles.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(lower(NEW.email), ''),
    CASE NEW.raw_app_meta_data ->> 'beta_role'
      WHEN 'grader' THEN 'grader' WHEN 'admin' THEN 'admin' ELSE 'candidate' END);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
