-- Menu items for multi-device sync
create table if not exists menu_items (
  restaurant text not null,
  id text not null,
  name text not null,
  price numeric not null,
  category text,
  created_at timestamp default now(),
  primary key (restaurant, id)
);

alter table menu_items enable row level security;

create policy "Menu items select allowed"
on menu_items for select
using (true);

-- This app manages roles via PIN (not Supabase Auth), so keep write access open.
create policy "Menu items insert allowed"
on menu_items for insert
with check (true);

create policy "Menu items update allowed"
on menu_items for update
using (true);

create policy "Menu items delete allowed"
on menu_items for delete
using (true);

