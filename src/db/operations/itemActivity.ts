/**
 * ItemActivity - Activity history logging for inventory items
 * 
 * Tracks: transfers, adjustments, edits, stock changes
 */

import { STORES } from '../schema';
import { getAllFromStore, putToStore, generateLocalId } from '../database';

export type ActivityType = 
  | 'transfer_in'
  | 'transfer_out' 
  | 'adjustment'
  | 'edit'
  | 'created'
  | 'deleted';

export interface ItemActivity {
  id: string;
  local_id: string;
  product_id: string;
  type: ActivityType;
  quantity_before?: number;
  quantity_after?: number;
  from_location_id?: string;
  to_location_id?: string;
  note?: string;
  created_by?: string;
  created_at: string;
  sync_status: 'synced' | 'pending';
}

export async function logActivity(
  productId: string,
  type: ActivityType,
  data: {
    quantity_before?: number;
    quantity_after?: number;
    from_location_id?: string;
    to_location_id?: string;
    note?: string;
  }
): Promise<void> {
  const activity: ItemActivity = {
    id: generateLocalId(),
    local_id: generateLocalId(),
    product_id: productId,
    type,
    quantity_before: data.quantity_before,
    quantity_after: data.quantity_after,
    from_location_id: data.from_location_id,
    to_location_id: data.to_location_id,
    note: data.note,
    created_at: new Date().toISOString(),
    sync_status: 'pending',
  };

  await putToStore(STORES.item_activity, activity);
}

export async function getItemHistory(productId: string): Promise<ItemActivity[]> {
  const allActivities = await getAllFromStore<ItemActivity>(STORES.item_activity);
  
  return allActivities
    .filter(a => a.product_id === productId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function formatActivityType(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    transfer_in: 'Received',
    transfer_out: 'Transferred Out',
    adjustment: 'Stock Adjusted',
    edit: 'Details Updated',
    created: 'Item Created',
    deleted: 'Item Deleted',
  };
  return labels[type] || type;
}

export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    transfer_in: '📥',
    transfer_out: '📤',
    adjustment: '⚖️',
    edit: '✏️',
    created: '✨',
    deleted: '🗑️',
  };
  return icons[type] || '📝';
}
