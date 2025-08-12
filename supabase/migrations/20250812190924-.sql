-- Storage bucket for uploaded documents
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict (id) do nothing;

-- Table: analyses
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  document_name text,
  storage_path text, -- path in storage bucket (e.g., userId/filename.pdf)
  text_length int,
  language text,
  status text not null default 'completed',
  plagiarism_score int, -- 0-100
  ai_score int, -- 0-100
  copyleaks_result jsonb,
  gptzero_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.analyses enable row level security;

-- Update updated_at trigger support
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_analyses_updated_at
before update on public.analyses
for each row execute function public.update_updated_at_column();

-- Policies for analyses
create policy if not exists "Users can view their own analyses"
  on public.analyses for select
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own analyses"
  on public.analyses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own analyses"
  on public.analyses for update
  to authenticated
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own analyses"
  on public.analyses for delete
  to authenticated
  using (auth.uid() = user_id);

-- Table: analysis_sentences (per-sentence scoring and highlighting)
create table if not exists public.analysis_sentences (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  idx int not null, -- sentence index in the text
  text text not null,
  plagiarism int, -- 0-100
  ai int, -- 0-100
  source_url text, -- for plagiarism source if any
  start_offset int, -- start char offset in full text
  end_offset int, -- end char offset in full text
  page int, -- optional page number for PDF
  bbox jsonb, -- optional bounding box for PDF highlighting
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_sentences_analysis_id on public.analysis_sentences(analysis_id);

-- Enable RLS
alter table public.analysis_sentences enable row level security;

-- Policies for analysis_sentences (inherit ownership from parent analysis)
create policy if not exists "Users can view their own analysis sentences"
  on public.analysis_sentences for select
  to authenticated
  using (exists (
    select 1 from public.analyses a
    where a.id = analysis_id and a.user_id = auth.uid()
  ));

create policy if not exists "Users can insert their own analysis sentences"
  on public.analysis_sentences for insert
  to authenticated
  with check (exists (
    select 1 from public.analyses a
    where a.id = analysis_id and a.user_id = auth.uid()
  ));

create policy if not exists "Users can update their own analysis sentences"
  on public.analysis_sentences for update
  to authenticated
  using (exists (
    select 1 from public.analyses a
    where a.id = analysis_id and a.user_id = auth.uid()
  ));

create policy if not exists "Users can delete their own analysis sentences"
  on public.analysis_sentences for delete
  to authenticated
  using (exists (
    select 1 from public.analyses a
    where a.id = analysis_id and a.user_id = auth.uid()
  ));

-- Storage policies for private bucket 'documents'
-- Require path structure: userId/filename.ext
create policy if not exists "Users can upload their own documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can read their own documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can update their own documents"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy if not exists "Users can delete their own documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );