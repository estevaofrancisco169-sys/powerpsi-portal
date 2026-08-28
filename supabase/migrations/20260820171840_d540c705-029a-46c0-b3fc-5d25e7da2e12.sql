CREATE POLICY "Autenticados leem capas" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'capas');
CREATE POLICY "Admin gerencia capas" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'capas' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'capas' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Autenticados assistem aulas" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'aulas');
CREATE POLICY "Admin gerencia arquivos de aulas" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'aulas' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'aulas' AND public.has_role(auth.uid(),'admin'));