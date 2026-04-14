/**
 * Vendor Operations
 */

import { type Vendor, STORES } from '../schema';
import { getFromStore, getAllFromStore, queryByIndex, putToStore, deleteFromStore, generateLocalId } from '../database';
import { queueCreate, queueUpdate, queueDelete } from '../sync-queue';

export interface CreateVendorInput {
  name: string;
  organization_id: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  lead_time_days?: number;
}

export async function createVendor(input: CreateVendorInput): Promise<Vendor> {
  const now = new Date().toISOString();
  const localId = generateLocalId();

  const vendor: Vendor = {
    id: null,
    local_id: localId,
    sync_status: 'pending',
    sync_version: 1,
    organization_id: input.organization_id,
    name: input.name,
    contact_name: input.contact_name,
    email: input.email,
    phone: input.phone,
    address: input.address,
    payment_terms: input.payment_terms,
    lead_time_days: input.lead_time_days,
    qbo_vendor_id: undefined,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  await putToStore(STORES.vendors, vendor);

  const syncData = { ...vendor };
  delete (syncData as Partial<Vendor>).id;
  delete (syncData as Partial<Vendor>).local_id;
  await queueCreate(STORES.vendors, localId, syncData);

  return vendor;
}

export async function getVendor(localId: string): Promise<Vendor | undefined> {
  return getFromStore<Vendor>(STORES.vendors, localId);
}

export async function getVendorsByOrganization(organizationId: string): Promise<Vendor[]> {
  return queryByIndex(STORES.vendors, 'by_organization', organizationId);
}

export async function updateVendor(
  localId: string,
  updates: Partial<CreateVendorInput>
): Promise<Vendor | undefined> {
  const existing = await getVendor(localId);
  if (!existing) return undefined;

  const now = new Date().toISOString();

  const updated: Vendor = {
    ...existing,
    ...updates,
    local_id: localId,
    id: existing.id,
    sync_status: 'pending',
    sync_version: existing.sync_version + 1,
    updated_at: now,
  };

  await putToStore(STORES.vendors, updated);

  const syncData = { ...updates, sync_version: updated.sync_version };
  await queueUpdate(STORES.vendors, localId, existing.id, syncData, updated.sync_version);

  return updated;
}

export async function deleteVendor(localId: string): Promise<boolean> {
  const existing = await getVendor(localId);
  if (!existing) return false;

  const now = new Date().toISOString();

  const updated: Vendor = {
    ...existing,
    deleted_at: now,
    sync_status: 'pending',
    sync_version: existing.sync_version + 1,
    updated_at: now,
    is_active: false,
  };

  await putToStore(STORES.vendors, updated);
  await queueDelete(STORES.vendors, localId, existing.id, updated.sync_version);

  return true;
}
