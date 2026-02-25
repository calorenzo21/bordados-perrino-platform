-- ============================================
-- Entregas parciales con cantidad
-- Añade quantity_delivered a order_status_history
-- para registrar piezas entregadas en cada entrega parcial
-- ============================================

ALTER TABLE order_status_history
ADD COLUMN quantity_delivered INTEGER CHECK (quantity_delivered IS NULL OR quantity_delivered > 0);
