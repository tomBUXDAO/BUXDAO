-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('holder', 'whale', 'token', 'special')),
  collection VARCHAR(50) NOT NULL,
  threshold INTEGER DEFAULT 1,
  discord_role_id VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on discord_role_id for faster lookups
CREATE INDEX IF NOT EXISTS roles_discord_role_id_idx ON roles(discord_role_id);

-- Create index on type and collection for faster filtering
CREATE INDEX IF NOT EXISTS roles_type_collection_idx ON roles(type, collection);

-- Insert default roles
INSERT INTO roles (name, type, collection, threshold, discord_role_id) VALUES
-- Holder roles
('FCKed Catz Holder', 'holder', 'fcked_catz', 1, '1234567890'),
('Money Monsters Holder', 'holder', 'money_monsters', 1, '1234567891'),
('AI BitBots Holder', 'holder', 'ai_bitbots', 1, '1234567892'),
('Money Monsters 3D Holder', 'holder', 'moneymonsters3d', 1, '1234567893'),
('Celebrity Catz Holder', 'holder', 'celebcatz', 1, '1234567894'),

-- Whale roles
('FCKed Catz Whale', 'whale', 'fcked_catz', 25, '1234567895'),
('Money Monsters Whale', 'whale', 'money_monsters', 25, '1234567896'),
('AI BitBots Whale', 'whale', 'ai_bitbots', 10, '1234567897'),
('Money Monsters 3D Whale', 'whale', 'moneymonsters3d', 25, '1234567898'),

-- BUX token roles
('BUX Beginner', 'token', 'bux', 2500, '1234567899'),
('BUX Builder', 'token', 'bux', 10000, '1234567900'),
('BUX Saver', 'token', 'bux', 25000, '1234567901'),
('BUX Banker', 'token', 'bux', 50000, '1234567902'),

-- Special roles
('BUXDAO 5', 'special', NULL, 5, '1234567903')
ON CONFLICT DO NOTHING; 