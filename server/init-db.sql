-- System Monitoring Dashboard Database Schema

-- Drop table if exists
DROP TABLE IF EXISTS systems;

-- Create systems table
CREATE TABLE systems (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    api_url VARCHAR(500) NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT 'blue',
    icon VARCHAR(10) NOT NULL DEFAULT '🖥️',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster searches
CREATE INDEX idx_systems_name ON systems(name);

-- Insert default systems
INSERT INTO systems (id, name, description, api_url, color, icon) VALUES
('local-primary', 'Primary Server', 'Main production server', 'http://localhost:3001', 'blue', '🖥️'),
('local-secondary', 'Development Server', 'Development environment', 'http://localhost:3002', 'purple', '💻');
