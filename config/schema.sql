-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    discord_role_id VARCHAR(255) UNIQUE NOT NULL,
    color VARCHAR(7),
    emoji_url TEXT,
    priority INTEGER DEFAULT 0
);

-- Create holders table
CREATE TABLE IF NOT EXISTS holders (
    discord_id VARCHAR(255) PRIMARY KEY,
    discord_username VARCHAR(255),
    wallet_address VARCHAR(255),
    roles TEXT[],
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create nft_metadata table
CREATE TABLE IF NOT EXISTS nft_metadata (
    mint_address VARCHAR(255) PRIMARY KEY,
    owner_discord_id VARCHAR(255),
    symbol VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    image_url TEXT,
    attributes JSONB,
    FOREIGN KEY (owner_discord_id) REFERENCES holders(discord_id)
);

-- Create bux_holders table
CREATE TABLE IF NOT EXISTS bux_holders (
    discord_id VARCHAR(255) PRIMARY KEY,
    balance DECIMAL(20,9) DEFAULT 0,
    unclaimed_rewards DECIMAL(20,9) DEFAULT 0,
    last_claim TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (discord_id) REFERENCES holders(discord_id)
);

-- Insert default roles
INSERT INTO roles (name, discord_role_id, color, priority) VALUES
('CAT', '1234567890', '#FF69B4', 100),
('MONSTER', '1234567891', '#32CD32', 90),
('BITBOT', '1234567892', '#4169E1', 80),
('MONSTER 3D', '1234567893', '#9370DB', 70),
('CELEB', '1234567894', '#FFD700', 60),
('MONSTER 🐋', '1234567895', '#00CED1', 50),
('BUX BANKER', '1234567896', '#FF4500', 40),
('MEGA BOT 🐋', '1234567897', '#8A2BE2', 30),
('BUX 5', '1234567898', '#FF8C00', 20)
ON CONFLICT (discord_role_id) DO NOTHING; 