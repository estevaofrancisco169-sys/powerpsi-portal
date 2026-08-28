ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC) AS rn FROM public.videos
)
UPDATE public.videos v SET ordem = r.rn FROM ranked r WHERE v.id = r.id;

CREATE OR REPLACE FUNCTION public.set_video_ordem()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ordem IS NULL OR NEW.ordem = 0 THEN
    SELECT COALESCE(MAX(ordem), 0) + 1 INTO NEW.ordem FROM public.videos;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_video_ordem_trigger ON public.videos;
CREATE TRIGGER set_video_ordem_trigger
BEFORE INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.set_video_ordem();