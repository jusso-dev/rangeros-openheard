ALTER TABLE user ADD COLUMN clerk_id TEXT;
CREATE UNIQUE INDEX user_clerk_id_unique ON user(clerk_id);
