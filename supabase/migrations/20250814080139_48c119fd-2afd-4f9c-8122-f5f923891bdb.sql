-- Créer les politiques RLS pour le bucket documents
-- Les utilisateurs peuvent télécharger leurs propres documents
CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Les utilisateurs peuvent télécharger leurs propres documents
CREATE POLICY "Users can download their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Les utilisateurs peuvent supprimer leurs propres documents
CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);