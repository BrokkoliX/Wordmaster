-- Migration: Add role column to users table
-- This allows admin access control

-- Add role column with default 'user' value
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Create index for faster role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Set existing users to 'user' role (if column was just added)
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Optional: Promote specific user to admin (update with your email)
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- Add constraint to ensure only valid roles
ALTER TABLE users 
ADD CONSTRAINT check_user_role 
CHECK (role IN ('user', 'admin', 'superadmin', 'moderator'));

COMMENT ON COLUMN users.role IS 'User role: user, admin, superadmin, or moderator';
