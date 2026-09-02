-- Add payment method tracking for closed bills
alter table bills add column if not exists payment_method text;

-- Optional constraint (kept simple text to avoid breaking existing rows).
-- You can enforce values later with:
-- alter table bills add constraint bills_payment_method_check check (payment_method in ('cash','scan','card'));

