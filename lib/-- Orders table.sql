-- Orders table
create table orders (
  id uuid default uuid_generate_v4() primary key,
  order_id text not null,
  type text not null,
  items jsonb not null,
  total decimal not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  table_number text
);

-- Order status table
create table order_status (
  id uuid default uuid_generate_v4() primary key,
  type text not null,
  number text not null,
  is_occupied boolean default false
);