-- bills close state
alter table bills add column if not exists is_closed boolean default false;
alter table bills add column if not exists closed_at timestamp;

-- users restaurant for per-restaurant staff pins
alter table users add column if not exists restaurant text;

-- users policies to allow app-managed pins
alter table users enable row level security;

create policy "Users insert allowed"
on users for insert
with check (true);

create policy "Users update allowed"
on users for update
using (true);
