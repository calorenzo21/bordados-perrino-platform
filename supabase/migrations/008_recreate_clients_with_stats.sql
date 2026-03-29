-- Recreate clients_with_stats view to:
-- 1. Include the new is_active column (c.* expansion)
-- 2. Filter out soft-deleted clients (is_active = false)
-- This way no application code needs is_active filters.

DROP VIEW IF EXISTS clients_with_stats;

CREATE VIEW clients_with_stats AS
SELECT
  c.*,
  COALESCE(order_stats.total_orders, 0) as total_orders,
  COALESCE(order_stats.active_orders, 0) as active_orders,
  COALESCE(order_stats.completed_orders, 0) as completed_orders,
  COALESCE(order_stats.total_spent, 0) as total_spent,
  order_stats.last_order_date
FROM clients c
LEFT JOIN (
  SELECT
    client_id,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status IN ('RECIBIDO', 'CONFECCION', 'RETIRO', 'PARCIALMENTE_ENTREGADO')) as active_orders,
    COUNT(*) FILTER (WHERE status = 'ENTREGADO') as completed_orders,
    SUM(total) FILTER (WHERE status != 'CANCELADO') as total_spent,
    MAX(created_at) as last_order_date
  FROM orders
  GROUP BY client_id
) order_stats ON c.id = order_stats.client_id
WHERE c.is_active = true;
