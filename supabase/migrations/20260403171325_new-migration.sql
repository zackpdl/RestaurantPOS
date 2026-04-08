-- bills table
create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  restaurant text,
  table_number int,
  items jsonb,
  subtotal numeric,
  tax_enabled boolean,
  tax numeric,
  total numeric,
  created_at timestamp default now()
);

-- users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  role text check (role in ('admin', 'staff')),
  pin text
);

-- enable RLS
alter table bills enable row level security;

-- policies
create policy "Bills select allowed"
on bills for select
using (true);

create policy "Bills insert allowed"
on bills for insert
with check (true);

create policy "Bills update allowed"
on bills for update
using (true);

create policy "Only admin can delete"
on bills for delete
using (auth.role() = 'admin');

-- seed admin user (change PIN if needed)
insert into users (role, pin)
values ('admin', '12345');
