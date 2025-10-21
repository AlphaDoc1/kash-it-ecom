export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'approved',
  'assigned',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const STATUS_COLOR_CLASS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-400',
  assigned: 'bg-blue-500',
  picked_up: 'bg-violet-500',
  out_for_delivery: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
};


