-- Create sync sequence for tracking server-side sync versions
CREATE SEQUENCE IF NOT EXISTS sync_sequence START 1;

-- Add comment
COMMENT ON SEQUENCE sync_sequence IS 'Sequence for generating server-side sync version numbers';
