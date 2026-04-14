/**
 * Category Operations
 */

import { type Category, STORES } from '../schema';
import { getFromStore, getAllFromStore, queryByIndex, putToStore, deleteFromStore, generateLocalId } from '../database';
import { queueCreate, queueUpdate, queueDelete } from '../sync-queue';

export interface CreateCategoryInput {
  name: string;
  organization_id: string;
  description?: string;
  qbo_account_ref?: string;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const now = new Date().toISOString();
  const localId = generateLocalId();

  const category: Category = {
    id: null,
    local_id: localId,
    sync_status: 'pending',
    sync_version: 1,
    name: input.name,
    organization_id: input.organization_id,
    description: input.description,
    qbo_account_ref: input.qbo_account_ref,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  await putToStore(STORES.categories, category);

  const syncData = { ...category };
  delete (syncData as Partial<Category>).id;
  delete (syncData as Partial<Category>).local_id;
  await queueCreate(STORES.categories, localId, syncData);

  return category;
}

export async function getCategory(localId: string): Promise<Category | undefined> {
  return getFromStore<Category>(STORES.categories, localId);
}

export async function getCategoriesByOrganization(organizationId: string): Promise<Category[]> {
  return queryByIndex(STORES.categories, 'by_organization', organizationId);
}

export async function updateCategory(
  localId: string,
  updates: Partial<CreateCategoryInput>
): Promise<Category | undefined> {
  const existing = await getCategory(localId);
  if (!existing) return undefined;

  const now = new Date().toISOString();

  const updated: Category = {
    ...existing,
    ...updates,
    local_id: localId,
    id: existing.id,
    sync_status: 'pending',
    sync_version: existing.sync_version + 1,
    updated_at: now,
  };

  await putToStore(STORES.categories, updated);

  const syncData = { ...updates, sync_version: updated.sync_version };
  await queueUpdate(STORES.categories, localId, existing.id, syncData, updated.sync_version);

  return updated;
}

export async function deleteCategory(localId: string): Promise<boolean> {
  const existing = await getCategory(localId);
  if (!existing) return false;

  const now = new Date().toISOString();

  const updated: Category = {
    ...existing,
    deleted_at: now,
    sync_status: 'pending',
    sync_version: existing.sync_version + 1,
    updated_at: now,
  };

  await putToStore(STORES.categories, updated);
  await queueDelete(STORES.categories, localId, existing.id, updated.sync_version);

  return true;
}
