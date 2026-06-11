-- Run this in your Supabase SQL editor

create table submissions (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  name text,
  state text,
  products text[],
  white_shade text,
  gum_shade text,
  selected_teeth integer[],
  teeth_not_sure boolean default false,
  impression_photos text[],
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (allow anonymous inserts from the app)
alter table submissions enable row level security;

create policy "Allow public inserts" on submissions
  for insert with check (true);

-- Storage bucket for impression photos
-- Run in Supabase Dashboard → Storage → New bucket:
--   Name: impression-photos
--   Public: true
