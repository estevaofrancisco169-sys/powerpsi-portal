-- ENUM
CREATE TYPE public.app_role AS ENUM ('admin','aluno');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL,
  email text NOT NULL,
  documento text,
  documento_tipo text,
  cnpj text,
  empresa text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Usuário vê o próprio perfil" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Usuário edita o próprio perfil" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia perfis" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Usuário vê os próprios papéis" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  razao_social text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia empresas" ON public.companies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validar_cnpj_cliente(_cnpj text)
RETURNS TABLE(razao_social text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.razao_social FROM public.companies c
  WHERE regexp_replace(c.cnpj,'\D','','g') = regexp_replace(_cnpj,'\D','','g') AND c.ativo;
$$;
GRANT EXECUTE ON FUNCTION public.validar_cnpj_cliente(text) TO anon, authenticated;

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos autenticados veem áreas" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin gerencia áreas" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- VIDEOS
CREATE TABLE public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tema text,
  descricao text,
  habilidades text[] NOT NULL DEFAULT '{}',
  duracao_min integer,
  duracao_seg integer,
  categoria_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  publicado boolean NOT NULL DEFAULT true,
  video_url text,
  video_path text,
  capa_path text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alunos veem aulas publicadas" ON public.videos FOR SELECT TO authenticated
  USING (publicado OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin gerencia aulas" ON public.videos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- VIDEO VIEWS
CREATE TABLE public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  progresso_seg integer NOT NULL DEFAULT 0,
  max_progresso_seg integer NOT NULL DEFAULT 0,
  concluido boolean NOT NULL DEFAULT false,
  primeira_vez timestamptz NOT NULL DEFAULT now(),
  ultima_vez timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_views TO authenticated;
GRANT ALL ON public.video_views TO service_role;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Aluno gerencia o próprio progresso" ON public.video_views FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ACCESS LOGS
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_agent text,
  ocorrido_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registrar próprio acesso" ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Ver acessos" ON public.access_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ACTIVE SESSIONS
CREATE TABLE public.active_sessions (
  user_id uuid PRIMARY KEY,
  session_id text NOT NULL,
  iniciada_em timestamptz NOT NULL DEFAULT now(),
  ultimo_ping timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.active_sessions TO authenticated;
GRANT ALL ON public.active_sessions TO service_role;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gerenciar a própria sessão" ON public.active_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- NOVO USUÁRIO -> perfil + papel
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, documento, documento_tipo, cnpj, empresa)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'documento',
    NEW.raw_user_meta_data->>'documento_tipo',
    CASE WHEN NEW.raw_user_meta_data->>'documento_tipo' = 'cnpj' THEN NEW.raw_user_meta_data->>'documento' END,
    NEW.raw_user_meta_data->>'empresa'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'aluno'))
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER videos_touch_updated_at BEFORE UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ZERAR PROGRESSO QUANDO A FONTE DO VÍDEO MUDA
CREATE OR REPLACE FUNCTION public.reset_progresso_ao_trocar_video()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.video_url,'') IS DISTINCT FROM COALESCE(OLD.video_url,'')
     OR COALESCE(NEW.video_path,'') IS DISTINCT FROM COALESCE(OLD.video_path,'') THEN
    DELETE FROM public.video_views WHERE video_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER videos_reset_progresso AFTER UPDATE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.reset_progresso_ao_trocar_video();
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_progresso_ao_trocar_video() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.validar_cnpj_cliente(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_cnpj_cliente(text) TO anon, authenticated, service_role;