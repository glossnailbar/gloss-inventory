-- Create demo organization for testing
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000002', 'Demo Organization', 'demo-gloss-heights', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
