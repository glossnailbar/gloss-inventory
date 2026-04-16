-- Add organization_id to inventory_levels for sync support
ALTER TABLE inventory_levels 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_inventory_levels_org ON inventory_levels(organization_id);

-- Add comment
COMMENT ON COLUMN inventory_levels.organization_id IS 'Organization ID for sync filtering';
