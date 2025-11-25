-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: admin123)
-- Hash generated using bcryptjs.hashSync('admin123', 10)
INSERT INTO users (username, password_hash)
VALUES ('admin', '$2b$10$Rr0gjscvSyUOOX4SXQ8mgufNuHZ/IXXj4CRSSSF7nAjKNBwUgCIfS')
ON CONFLICT (username) DO NOTHING;
