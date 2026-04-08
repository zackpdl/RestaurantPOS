-- orders table for live + history
create table if not exists orders (
  order_id text primary key,
  type text check (type in ('dine-in', 'takeaway')),
  items jsonb,
  total numeric,
  timestamp timestamp,
  table_number text,
  is_closed boolean default false,
  closed_at timestamp
);

-- optional order status table used by table selection
create table if not exists order_status (
  id uuid primary key default gen_random_uuid(),
  type text,
  number text,
  is_occupied boolean default false
);
