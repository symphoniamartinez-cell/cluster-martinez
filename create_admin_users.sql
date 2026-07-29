CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read admin_users" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert admin_users" ON admin_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update admin_users" ON admin_users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete admin_users" ON admin_users FOR DELETE USING (true);
