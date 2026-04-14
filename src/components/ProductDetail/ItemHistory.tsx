/**
 * ItemHistory - Activity log for inventory items
 * 
 * Shows: transfers, adjustments, edits, etc.
 */

import React, { useState, useEffect } from 'react';
import { ProductWithInventory } from '../../db/operations/products';
import { getItemHistory, ItemActivity, formatActivityType, getActivityIcon } from '../../db/operations/itemActivity';
import { useLocations } from '../../hooks/useLocations';

export interface ItemHistoryProps {
  product: ProductWithInventory;
}

export const ItemHistory: React.FC<ItemHistoryProps> = ({ product }) => {
  const [history, setHistory] = useState<ItemActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { locations } = useLocations('demo-gloss-heights');

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const activities = await getItemHistory(product.local_id);
        setHistory(activities);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [product.local_id]);

  const getLocationName = (id?: string) => {
    if (!id) return '';
    return locations.find(l => l.local_id === id)?.name || id;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderActivityDetail = (activity: ItemActivity) => {
    switch (activity.type) {
      case 'transfer_out':
        return `Moved ${activity.quantity_after} to ${getLocationName(activity.to_location_id)}`;
      case 'transfer_in':
        return `Received ${activity.quantity_after} from ${getLocationName(activity.from_location_id)}`;
      case 'adjustment':
        if (activity.quantity_before !== undefined && activity.quantity_after !== undefined) {
          const change = activity.quantity_after - activity.quantity_before;
          const sign = change > 0 ? '+' : '';
          return `Adjusted: ${activity.quantity_before} → ${activity.quantity_after} (${sign}${change})`;
        }
        return 'Stock adjusted';
      case 'edit':
        return activity.note || 'Details updated';
      case 'created':
        return 'Item created';
      case 'deleted':
        return 'Item deleted';
      default:
        return activity.note || '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No activity recorded yet</p>
        <p className="text-xs mt-1">Actions like transfers, adjustments, and edits will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((activity) => (
        <div key={activity.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center text-lg shadow-sm">
            {getActivityIcon(activity.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-900">{formatActivityType(activity.type)}</p>
              <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(activity.created_at)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{renderActivityDetail(activity)}</p>
            {activity.note && activity.type !== 'edit' && (
              <p className="text-xs text-gray-500 mt-1 italic">{activity.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
