# 🍽️ Restaurant POS App (React Native + Supabase)

## 📌 Project Overview
A simple restaurant POS app for Android using React Native + Supabase backend.

Focus:
- Fast billing
- Multi-device sync
- Role-based access (staff/admin)
- Bluetooth printing

---

## 🏪 Restaurants

1. Tom Yum Goong
2. The View

Each restaurant:
- Separate menu
- Shared tables (1–50)

---

## 👤 User Roles

### STAFF
- Create bills
- Update bills
- Print bills
- ❌ Cannot delete bills

### ADMIN
- Full access
- Can delete bills

---

## 🧾 Database (Supabase)

### Table: bills

Columns:

- id (uuid, primary key)
- restaurant (text)
- table_number (int)
- items (jsonb)
- subtotal (numeric)
- tax_enabled (boolean)
- tax (numeric)
- total (numeric)
- created_at (timestamp)

---

### Table: users

- id (uuid)
- role ("admin" or "staff")
- pin (text)

---

## 🔐 Security (IMPORTANT)

Use Supabase Row Level Security (RLS):

### Bills नीति:

- SELECT → allowed for all
- INSERT → allowed for all
- UPDATE → allowed for all
- DELETE → ONLY admin

Example policy:

```sql
CREATE POLICY "Only admin can delete"
ON bills
FOR DELETE
USING (auth.role() = 'admin');
