-- Complete Gloss Inventory Schema Migration
-- Includes all base tables + auth tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (top-level tenant)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    qbo_company_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Organization members (links users to organizations)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'staff')),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Locations (physical locations)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id VARCHAR(255) UNIQUE,
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_version INTEGER DEFAULT 1,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id VARCHAR(255) UNIQUE,
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    qbo_account_id VARCHAR(255),
    qbo_asset_account_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_version INTEGER DEFAULT 1,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id VARCHAR(255) UNIQUE,
    organization_id UUID REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    address TEXT,
    payment_terms VARCHAR(100),
    lead_time_days INTEGER,
    qbo_vendor_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_version INTEGER DEFAULT 1,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id VARCHAR(255) UNIQUE,
    organization_id UUID REFERENCES organizations(id),
    category_id UUID REFERENCES categories(id),
    vendor_id UUID REFERENCES vendors(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(255),
    barcode VARCHAR(255),
    unit_of_measure VARCHAR(50) DEFAULT 'piece',
    reorder_point INTEGER DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    max_level INTEGER,
    unit_cost DECIMAL(10,2),
    purchase_link TEXT,
    brand VARCHAR(255),
    origin VARCHAR(255),
    tags TEXT[],
    item_size VARCHAR(100),
    price_per DECIMAL(10,2),
    pcs_per_box INTEGER,
    attribute1_name VARCHAR(255),
    attribute1_value VARCHAR(255),
    attribute2_name VARCHAR(255),
    attribute2_value VARCHAR(255),
    attribute3_name VARCHAR(255),
    attribute3_value VARCHAR(255),
    image_url TEXT,
    image_url2 TEXT,
    image_url3 TEXT,
    qbo_item_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_version INTEGER DEFAULT 1,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Inventory Levels
CREATE TABLE IF NOT EXISTS inventory_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id VARCHAR(255) UNIQUE,
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES locations(id),
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_reserved INTEGER DEFAULT 0,
    sync_status VARCHAR(20) DEFAULT 'synced',
    sync_version INTEGER DEFAULT 1,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(product_id, location_id)
);

-- Sync Queue
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(255),
    local_id VARCHAR(255),
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    payload JSONB,
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending',
    sync_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync State
CREATE TABLE IF NOT EXISTS sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(255) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_sequence INTEGER DEFAULT 0,
    is_syncing BOOLEAN DEFAULT false,
    pending_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'staff')),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(email, organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_locations_org ON locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_categories_org ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory_levels(location_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_device ON sync_queue(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default organization
INSERT INTO organizations (id, name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Gloss Nail Bar', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert default location
INSERT INTO locations (id, local_id, organization_id, name, is_active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'loc-default', '00000000-0000-0000-0000-000000000001', 'Default', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert demo user (password: password123)
-- Note: In production, use bcrypt hash
INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo@glossnail.bar', '$2b$10$YourHashedPasswordHere', 'Demo', 'User', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Link demo user to organization
INSERT INTO organization_members (user_id, organization_id, role, joined_at, is_active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner', NOW(), true, NOW(), NOW())
ON CONFLICT (user_id, organization_id) DO NOTHING;
