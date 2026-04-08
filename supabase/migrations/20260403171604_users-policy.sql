-- ensure RLS is enabled and allow reads for login
alter table users enable row level security;

create policy "Users select allowed"
on users for select
using (true);

-- seed admin if missing
insert into users (role, pin)
select 'admin', '12345'
where not exists (select 1 from users where role = 'admin' and pin = '12345');
