-- allow deletes via app (UI enforces admin)
drop policy if exists "Only admin can delete" on bills;
create policy "Bills delete allowed" on bills for delete using (true);
