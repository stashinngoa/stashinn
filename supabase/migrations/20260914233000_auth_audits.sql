-- Create auth_audits table
CREATE TABLE auth_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    identifier TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('email', 'whatsapp', 'sms', 'auto')),
    success BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auth_audits ENABLE ROW LEVEL SECURITY;

-- Admins can read all audits
CREATE POLICY "Admins can read auth audits" ON auth_audits
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
