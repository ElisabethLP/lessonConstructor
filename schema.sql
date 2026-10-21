CREATE TABLE IF NOT EXISTS techniques (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    details TEXT,
    link TEXT,
    base BOOLEAN DEFAULT false,
    rating NUMERIC(3, 2) DEFAULT 0,
    votes INTEGER DEFAULT 0
);