alter table bills
add column if not exists table_label text;

create index if not exists bills_restaurant_table_label_idx
on bills (restaurant, table_number, table_label);
