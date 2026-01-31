-- ============================================
-- BORDADOS PERRINO - SEED DATA
-- ============================================
-- Datos de prueba para todas las pantallas
-- UUIDs válidos (solo caracteres hexadecimales 0-9, a-f)
-- ============================================

-- ============================================
-- 1. TIPOS DE GASTOS (predefinidos + personalizados)
-- ============================================
INSERT INTO expense_types (id, name, color, is_system) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Personal', 'bg-blue-500', TRUE),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'Castillo', 'bg-amber-500', TRUE),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'María (Costurera)', 'bg-pink-500', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000004', 'Rosa (Costurera)', 'bg-purple-500', FALSE),
  ('a1b2c3d4-0001-0001-0001-000000000005', 'Materiales', 'bg-emerald-500', FALSE);

-- ============================================
-- 2. CLIENTES (20 clientes variados)
-- ============================================
INSERT INTO clients (id, name, email, phone, cedula, address, notes, created_at) VALUES
  -- Cliente principal para testing (María García)
  ('c1a00000-0000-0000-0000-000000000001', 'María García', 'maria@email.com', '+54 9 11 1234-5678', '27.456.789-0', 'Av. Corrientes 1234, CABA, Buenos Aires', 'Cliente frecuente. Prefiere entregas los viernes. Empresa de marketing digital.', '2024-06-15'),
  ('c1a00000-0000-0000-0000-000000000002', 'Juan Pérez', 'juan@email.com', '+54 9 11 2345-6789', '30.123.456-7', 'San Martín 567, Buenos Aires', 'Colegio privado. Pedidos estacionales (uniformes).', '2024-08-20'),
  ('c1a00000-0000-0000-0000-000000000003', 'Ana López', 'ana@email.com', '+54 9 11 3456-7890', '25.789.012-3', 'Belgrano 890, Córdoba', 'Organizadora de eventos corporativos. Alta frecuencia de pedidos.', '2024-03-10'),
  ('c1a00000-0000-0000-0000-000000000004', 'Carlos Ruiz', 'carlos@email.com', '+54 9 11 4567-8901', '28.345.678-9', 'Mitre 234, Rosario', 'Empresa de tecnología. Pedidos de volumen alto.', '2024-11-05'),
  ('c1a00000-0000-0000-0000-000000000005', 'Laura Martínez', 'laura@email.com', '+54 9 11 5678-9012', '26.012.345-6', 'Rivadavia 456, Mendoza', 'Hotel boutique. Interesada en toallas y uniformes de personal.', '2024-05-22'),
  ('c1a00000-0000-0000-0000-000000000006', 'Roberto Silva', 'roberto@email.com', '+54 9 11 6789-0123', '29.567.890-1', 'Independencia 789, Tucumán', 'Fábrica de uniformes. Pedidos regulares mensuales.', '2024-04-12'),
  ('c1a00000-0000-0000-0000-000000000007', 'Patricia Fernández', 'patricia@email.com', '+54 9 11 7890-1234', '24.678.901-2', 'Sarmiento 321, La Plata', 'Escuela primaria. Pedidos dos veces al año.', '2024-02-28'),
  ('c1a00000-0000-0000-0000-000000000008', 'Miguel Torres', 'miguel@email.com', '+54 9 11 8901-2345', '31.234.567-8', 'Belgrano 654, Mar del Plata', 'Restaurant. Uniformes de personal.', '2024-07-18'),
  ('c1a00000-0000-0000-0000-000000000009', 'Sofía Ramírez', 'sofia@email.com', '+54 9 11 9012-3456', '27.890.123-4', 'San Juan 987, Salta', 'Tienda de deportes. Camisetas personalizadas.', '2024-09-05'),
  ('c1a00000-0000-0000-0000-000000000010', 'Diego Morales', 'diego@email.com', '+54 9 11 0123-4567', '32.456.789-0', 'Tucumán 147, Neuquén', 'Club deportivo. Equipación completa.', '2024-01-20'),
  ('c1a00000-0000-0000-0000-000000000011', 'Valentina Castro', 'valentina@email.com', '+54 9 11 1234-5670', '25.123.456-7', 'Lavalle 258, Bariloche', 'Hotel de montaña. Artículos de merchandising.', '2024-10-15'),
  ('c1a00000-0000-0000-0000-000000000012', 'Fernando Díaz', 'fernando@email.com', '+54 9 11 2345-6780', '28.901.234-5', 'Corrientes 369, Posadas', 'Gimnasio. Ropa deportiva personalizada.', '2024-08-01'),
  ('c1a00000-0000-0000-0000-000000000013', 'Luciana Herrera', 'luciana@email.com', '+54 9 11 3456-7891', '26.789.012-3', 'Jujuy 471, Resistencia', 'Consultora. Uniformes corporativos.', '2024-06-22'),
  ('c1a00000-0000-0000-0000-000000000014', 'Martín Acosta', 'martin@email.com', '+54 9 11 4567-8902', '30.567.890-1', 'Catamarca 582, San Luis', 'Colegio secundario. Uniformes y buzos.', '2024-03-30'),
  ('c1a00000-0000-0000-0000-000000000015', 'Camila Vega', 'camila@email.com', '+54 9 11 5678-9013', '24.345.678-9', 'La Rioja 693, Paraná', 'Empresa constructora. Chalecos y cascos.', '2024-12-01'),
  ('c1a00000-0000-0000-0000-000000000016', 'Nicolás Medina', 'nicolas@email.com', '+54 9 11 6789-0124', '29.234.567-8', 'Formosa 804, Rawson', 'Hospital. Uniformes médicos.', '2024-05-10'),
  ('c1a00000-0000-0000-0000-000000000017', 'Agustina Flores', 'agustina@email.com', '+54 9 11 7890-1235', '27.012.345-6', 'Chaco 915, Ushuaia', 'Agencia de viajes. Merchandising.', '2024-11-20'),
  ('c1a00000-0000-0000-0000-000000000018', 'Tomás Romero', 'tomas@email.com', '+54 9 11 8901-2346', '31.890.123-4', 'Santa Fe 126, Viedma', 'Cervecería artesanal. Merchandising.', '2024-04-05'),
  ('c1a00000-0000-0000-0000-000000000019', 'Isabella González', 'isabella@email.com', '+54 9 11 9012-3457', '25.678.901-2', 'Entre Ríos 237, Santa Rosa', 'Florería. Delantales personalizados.', '2024-09-28'),
  ('c1a00000-0000-0000-0000-000000000020', 'Alejandro Ruiz', 'alejandro@email.com', '+54 9 11 0123-4568', '28.456.789-0', 'Misiones 348, Río Gallegos', 'Petrolera. Ropa de trabajo.', '2024-07-15');

-- ============================================
-- 3. PEDIDOS (80 pedidos con distintos estados y fechas)
-- ============================================

-- Reset sequence para order_number
SELECT setval('order_number_seq', 1, false);

-- Pedidos RECIBIDO (8 pedidos - recientes)
INSERT INTO orders (id, client_id, description, service_type, quantity, total, status, is_urgent, due_date, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'c1a00000-0000-0000-0000-000000000001', 'Bordado de logo corporativo en 50 camisas polo color azul marino', 'Bordados', 50, 12500, 'RECIBIDO', FALSE, '2026-02-05', '2026-01-18'),
  ('a1000000-0000-0000-0000-000000000002', 'c1a00000-0000-0000-0000-000000000002', 'Uniformes escolares con logo institucional bordado', 'DTF', 30, 9000, 'RECIBIDO', TRUE, '2026-01-28', '2026-01-19'),
  ('a1000000-0000-0000-0000-000000000003', 'c1a00000-0000-0000-0000-000000000006', 'Camisetas promocionales para evento corporativo', 'Sublimación', 100, 15000, 'RECIBIDO', FALSE, '2026-02-10', '2026-01-17'),
  ('a1000000-0000-0000-0000-000000000004', 'c1a00000-0000-0000-0000-000000000009', 'Gorras personalizadas con logo de tienda', 'Impresión', 50, 7500, 'RECIBIDO', FALSE, '2026-02-15', '2026-01-16'),
  ('a1000000-0000-0000-0000-000000000005', 'c1a00000-0000-0000-0000-000000000012', 'Toallas de gimnasio con logo', 'Bordados', 40, 8000, 'RECIBIDO', FALSE, '2026-02-20', '2026-01-15'),
  ('a1000000-0000-0000-0000-000000000006', 'c1a00000-0000-0000-0000-000000000015', 'Chalecos de seguridad con nombre', 'Impresión y Planchado', 25, 6250, 'RECIBIDO', TRUE, '2026-01-30', '2026-01-20'),
  ('a1000000-0000-0000-0000-000000000007', 'c1a00000-0000-0000-0000-000000000018', 'Delantales con logo de cervecería', 'Bordados', 20, 5000, 'RECIBIDO', FALSE, '2026-02-08', '2026-01-19'),
  ('a1000000-0000-0000-0000-000000000008', 'c1a00000-0000-0000-0000-000000000003', 'Bolsas ecológicas para evento', 'Impresión', 200, 10000, 'RECIBIDO', FALSE, '2026-02-12', '2026-01-18');

-- Pedidos EN CONFECCIÓN (12 pedidos)
INSERT INTO orders (id, client_id, description, service_type, quantity, total, status, is_urgent, due_date, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000009', 'c1a00000-0000-0000-0000-000000000001', 'Chaquetas corporativas con logo en pecho y espalda', 'Bordados', 15, 18000, 'CONFECCION', FALSE, '2026-01-25', '2026-01-10'),
  ('a1000000-0000-0000-0000-000000000010', 'c1a00000-0000-0000-0000-000000000004', 'Camisetas tech con diseño full print', 'Sublimación', 75, 22500, 'CONFECCION', TRUE, '2026-01-22', '2026-01-08'),
  ('a1000000-0000-0000-0000-000000000011', 'c1a00000-0000-0000-0000-000000000007', 'Uniformes escolares temporada 2026', 'DTF', 150, 45000, 'CONFECCION', FALSE, '2026-02-01', '2026-01-05'),
  ('a1000000-0000-0000-0000-000000000012', 'c1a00000-0000-0000-0000-000000000010', 'Equipación completa club de fútbol', 'Sublimación', 50, 25000, 'CONFECCION', TRUE, '2026-01-23', '2026-01-07'),
  ('a1000000-0000-0000-0000-000000000013', 'c1a00000-0000-0000-0000-000000000013', 'Camisas corporativas bordadas', 'Bordados', 40, 12000, 'CONFECCION', FALSE, '2026-01-28', '2026-01-09'),
  ('a1000000-0000-0000-0000-000000000014', 'c1a00000-0000-0000-0000-000000000016', 'Uniformes médicos con nombre', 'Bordados', 60, 18000, 'CONFECCION', FALSE, '2026-01-30', '2026-01-11'),
  ('a1000000-0000-0000-0000-000000000015', 'c1a00000-0000-0000-0000-000000000019', 'Delantales florería personalizados', 'Bordados', 10, 3500, 'CONFECCION', FALSE, '2026-01-26', '2026-01-12'),
  ('a1000000-0000-0000-0000-000000000016', 'c1a00000-0000-0000-0000-000000000005', 'Toallas de hotel con logo bordado', 'Bordados', 100, 35000, 'CONFECCION', FALSE, '2026-02-05', '2026-01-06'),
  ('a1000000-0000-0000-0000-000000000017', 'c1a00000-0000-0000-0000-000000000008', 'Uniformes restaurant completos', 'Bordados', 30, 15000, 'CONFECCION', FALSE, '2026-01-27', '2026-01-10'),
  ('a1000000-0000-0000-0000-000000000018', 'c1a00000-0000-0000-0000-000000000011', 'Merchandising hotel de montaña', 'Sublimación', 80, 16000, 'CONFECCION', FALSE, '2026-02-03', '2026-01-08'),
  ('a1000000-0000-0000-0000-000000000019', 'c1a00000-0000-0000-0000-000000000014', 'Buzos escolares bordados', 'Bordados', 100, 40000, 'CONFECCION', TRUE, '2026-01-24', '2026-01-04'),
  ('a1000000-0000-0000-0000-000000000020', 'c1a00000-0000-0000-0000-000000000020', 'Ropa de trabajo petrolera', 'Impresión y Planchado', 50, 20000, 'CONFECCION', FALSE, '2026-01-29', '2026-01-09');

-- Pedidos LISTO PARA RETIRO (4 pedidos)
INSERT INTO orders (id, client_id, description, service_type, quantity, total, status, is_urgent, due_date, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000021', 'c1a00000-0000-0000-0000-000000000003', 'Gorras promocionales evento anual', 'Sublimación', 100, 25000, 'RETIRO', FALSE, '2026-01-20', '2025-12-28'),
  ('a1000000-0000-0000-0000-000000000022', 'c1a00000-0000-0000-0000-000000000017', 'Camisetas agencia de viajes', 'DTF', 30, 6000, 'RETIRO', FALSE, '2026-01-19', '2025-12-30'),
  ('a1000000-0000-0000-0000-000000000023', 'c1a00000-0000-0000-0000-000000000009', 'Equipamiento tienda deportes', 'Sublimación', 45, 13500, 'RETIRO', FALSE, '2026-01-18', '2025-12-25'),
  ('a1000000-0000-0000-0000-000000000024', 'c1a00000-0000-0000-0000-000000000006', 'Uniformes fábrica lote enero', 'DTF', 80, 24000, 'RETIRO', FALSE, '2026-01-21', '2025-12-27');

-- Pedidos PARCIALMENTE ENTREGADO (3 pedidos)
INSERT INTO orders (id, client_id, description, service_type, quantity, total, status, is_urgent, due_date, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000025', 'c1a00000-0000-0000-0000-000000000004', 'Camisetas corporativas DTF - Pedido grande', 'DTF', 200, 48000, 'PARCIALMENTE_ENTREGADO', TRUE, '2026-01-30', '2024-12-20'),
  ('a1000000-0000-0000-0000-000000000026', 'c1a00000-0000-0000-0000-000000000007', 'Bolsas ecológicas con logo escuela', 'Impresión', 300, 36000, 'PARCIALMENTE_ENTREGADO', FALSE, '2026-02-05', '2024-12-15'),
  ('a1000000-0000-0000-0000-000000000027', 'c1a00000-0000-0000-0000-000000000010', 'Uniformes deportivos club completo', 'Sublimación', 120, 28800, 'PARCIALMENTE_ENTREGADO', FALSE, '2026-01-28', '2025-01-03');

-- Pedidos ENTREGADOS (50 pedidos - histórico últimos 12 meses)
INSERT INTO orders (id, client_id, description, service_type, quantity, total, status, is_urgent, due_date, created_at) VALUES
  -- Enero 2026 (entregas recientes)
  ('a1000000-0000-0000-0000-000000000028', 'c1a00000-0000-0000-0000-000000000001', 'Gorras promocionales con vinil', 'Sublimación', 100, 8500, 'ENTREGADO', FALSE, '2026-01-05', '2025-12-20'),
  ('a1000000-0000-0000-0000-000000000029', 'c1a00000-0000-0000-0000-000000000002', 'Buzos deportivos bordados', 'Bordados', 25, 12000, 'ENTREGADO', FALSE, '2026-01-10', '2025-12-25'),
  ('a1000000-0000-0000-0000-000000000030', 'c1a00000-0000-0000-0000-000000000005', 'Toallas bordadas hotel', 'Bordados', 30, 4500, 'ENTREGADO', FALSE, '2026-01-12', '2025-12-28'),
  ('a1000000-0000-0000-0000-000000000031', 'c1a00000-0000-0000-0000-000000000008', 'Delantales restaurant', 'Bordados', 15, 3750, 'ENTREGADO', FALSE, '2026-01-08', '2025-12-22'),
  ('a1000000-0000-0000-0000-000000000032', 'c1a00000-0000-0000-0000-000000000011', 'Gorras hotel montaña', 'Sublimación', 50, 7500, 'ENTREGADO', FALSE, '2026-01-15', '2025-12-30'),
  
  -- Diciembre 2025
  ('a1000000-0000-0000-0000-000000000033', 'c1a00000-0000-0000-0000-000000000003', 'Camisetas evento navideño', 'DTF', 80, 16000, 'ENTREGADO', FALSE, '2025-12-20', '2025-12-05'),
  ('a1000000-0000-0000-0000-000000000034', 'c1a00000-0000-0000-0000-000000000012', 'Ropa deportiva gimnasio', 'Sublimación', 40, 12000, 'ENTREGADO', FALSE, '2025-12-15', '2025-11-28'),
  ('a1000000-0000-0000-0000-000000000035', 'c1a00000-0000-0000-0000-000000000014', 'Uniformes fin de año escolar', 'DTF', 60, 15000, 'ENTREGADO', FALSE, '2025-12-18', '2025-12-01'),
  ('a1000000-0000-0000-0000-000000000036', 'c1a00000-0000-0000-0000-000000000016', 'Batas médicas bordadas', 'Bordados', 20, 8000, 'ENTREGADO', FALSE, '2025-12-22', '2025-12-08'),
  ('a1000000-0000-0000-0000-000000000037', 'c1a00000-0000-0000-0000-000000000018', 'Merchandising cervecería navidad', 'Impresión', 100, 8000, 'ENTREGADO', FALSE, '2025-12-12', '2025-11-25'),
  
  -- Noviembre 2025
  ('a1000000-0000-0000-0000-000000000038', 'c1a00000-0000-0000-0000-000000000001', 'Camisetas evento anual', 'DTF', 40, 6000, 'ENTREGADO', FALSE, '2025-11-15', '2025-10-28'),
  ('a1000000-0000-0000-0000-000000000039', 'c1a00000-0000-0000-0000-000000000004', 'Polos corporativos', 'Bordados', 50, 17500, 'ENTREGADO', FALSE, '2025-11-20', '2025-11-05'),
  ('a1000000-0000-0000-0000-000000000040', 'c1a00000-0000-0000-0000-000000000006', 'Uniformes fábrica noviembre', 'DTF', 70, 21000, 'ENTREGADO', FALSE, '2025-11-25', '2025-11-10'),
  ('a1000000-0000-0000-0000-000000000041', 'c1a00000-0000-0000-0000-000000000009', 'Camisetas deportivas', 'Sublimación', 60, 12000, 'ENTREGADO', FALSE, '2025-11-18', '2025-11-01'),
  ('a1000000-0000-0000-0000-000000000042', 'c1a00000-0000-0000-0000-000000000013', 'Camisas consultora', 'Bordados', 30, 10500, 'ENTREGADO', FALSE, '2025-11-22', '2025-11-08'),
  ('a1000000-0000-0000-0000-000000000043', 'c1a00000-0000-0000-0000-000000000015', 'Chalecos obra noviembre', 'Impresión y Planchado', 40, 10000, 'ENTREGADO', FALSE, '2025-11-28', '2025-11-12'),
  ('a1000000-0000-0000-0000-000000000044', 'c1a00000-0000-0000-0000-000000000019', 'Delantales temporada', 'Bordados', 15, 5250, 'ENTREGADO', FALSE, '2025-11-10', '2025-10-25'),

  -- Octubre 2025
  ('a1000000-0000-0000-0000-000000000045', 'c1a00000-0000-0000-0000-000000000002', 'Uniformes primavera', 'DTF', 80, 24000, 'ENTREGADO', FALSE, '2025-10-20', '2025-10-05'),
  ('a1000000-0000-0000-0000-000000000046', 'c1a00000-0000-0000-0000-000000000005', 'Batas de baño bordadas', 'Bordados', 20, 8000, 'ENTREGADO', FALSE, '2025-10-15', '2025-09-28'),
  ('a1000000-0000-0000-0000-000000000047', 'c1a00000-0000-0000-0000-000000000007', 'Bolsas escolares', 'Impresión', 150, 15000, 'ENTREGADO', FALSE, '2025-10-25', '2025-10-10'),
  ('a1000000-0000-0000-0000-000000000048', 'c1a00000-0000-0000-0000-000000000010', 'Camisetas torneo', 'Sublimación', 100, 20000, 'ENTREGADO', FALSE, '2025-10-18', '2025-10-01'),
  ('a1000000-0000-0000-0000-000000000049', 'c1a00000-0000-0000-0000-000000000017', 'Merchandising agencia', 'DTF', 50, 7500, 'ENTREGADO', FALSE, '2025-10-22', '2025-10-08'),
  
  -- Septiembre 2025
  ('a1000000-0000-0000-0000-000000000050', 'c1a00000-0000-0000-0000-000000000003', 'Camisetas staff evento', 'DTF', 30, 9000, 'ENTREGADO', FALSE, '2025-09-20', '2025-09-05'),
  ('a1000000-0000-0000-0000-000000000051', 'c1a00000-0000-0000-0000-000000000008', 'Uniformes restaurant otoño', 'Bordados', 25, 12500, 'ENTREGADO', FALSE, '2025-09-15', '2025-08-28'),
  ('a1000000-0000-0000-0000-000000000052', 'c1a00000-0000-0000-0000-000000000011', 'Gorras promocionales', 'Sublimación', 80, 12000, 'ENTREGADO', FALSE, '2025-09-25', '2025-09-10'),
  ('a1000000-0000-0000-0000-000000000053', 'c1a00000-0000-0000-0000-000000000012', 'Toallas gimnasio', 'Bordados', 50, 10000, 'ENTREGADO', FALSE, '2025-09-18', '2025-09-01'),
  ('a1000000-0000-0000-0000-000000000054', 'c1a00000-0000-0000-0000-000000000016', 'Scrubs médicos', 'Bordados', 40, 16000, 'ENTREGADO', FALSE, '2025-09-22', '2025-09-08'),
  ('a1000000-0000-0000-0000-000000000055', 'c1a00000-0000-0000-0000-000000000020', 'Overoles petrolera', 'Impresión y Planchado', 30, 15000, 'ENTREGADO', FALSE, '2025-09-28', '2025-09-12'),

  -- Agosto 2025
  ('a1000000-0000-0000-0000-000000000056', 'c1a00000-0000-0000-0000-000000000001', 'Camisas verano', 'Bordados', 35, 12250, 'ENTREGADO', FALSE, '2025-08-20', '2025-08-05'),
  ('a1000000-0000-0000-0000-000000000057', 'c1a00000-0000-0000-0000-000000000004', 'Polos tech', 'Bordados', 45, 15750, 'ENTREGADO', FALSE, '2025-08-15', '2025-07-28'),
  ('a1000000-0000-0000-0000-000000000058', 'c1a00000-0000-0000-0000-000000000006', 'Uniformes agosto', 'DTF', 60, 18000, 'ENTREGADO', FALSE, '2025-08-25', '2025-08-10'),
  ('a1000000-0000-0000-0000-000000000059', 'c1a00000-0000-0000-0000-000000000009', 'Equipación verano', 'Sublimación', 70, 14000, 'ENTREGADO', FALSE, '2025-08-18', '2025-08-01'),
  ('a1000000-0000-0000-0000-000000000060', 'c1a00000-0000-0000-0000-000000000014', 'Uniformes invierno', 'DTF', 90, 27000, 'ENTREGADO', FALSE, '2025-08-22', '2025-08-08'),

  -- Julio 2025
  ('a1000000-0000-0000-0000-000000000061', 'c1a00000-0000-0000-0000-000000000002', 'Buzos invierno', 'Bordados', 40, 16000, 'ENTREGADO', FALSE, '2025-07-20', '2025-07-05'),
  ('a1000000-0000-0000-0000-000000000062', 'c1a00000-0000-0000-0000-000000000005', 'Toallas spa', 'Bordados', 25, 6250, 'ENTREGADO', FALSE, '2025-07-15', '2025-06-28'),
  ('a1000000-0000-0000-0000-000000000063', 'c1a00000-0000-0000-0000-000000000007', 'Merchandising escolar', 'Impresión', 100, 10000, 'ENTREGADO', FALSE, '2025-07-25', '2025-07-10'),
  ('a1000000-0000-0000-0000-000000000064', 'c1a00000-0000-0000-0000-000000000013', 'Camisas invierno', 'Bordados', 50, 17500, 'ENTREGADO', FALSE, '2025-07-18', '2025-07-01'),
  ('a1000000-0000-0000-0000-000000000065', 'c1a00000-0000-0000-0000-000000000015', 'Chalecos reflectantes', 'Impresión y Planchado', 60, 15000, 'ENTREGADO', FALSE, '2025-07-22', '2025-07-08'),

  -- Junio 2025
  ('a1000000-0000-0000-0000-000000000066', 'c1a00000-0000-0000-0000-000000000003', 'Camisetas congreso', 'DTF', 120, 24000, 'ENTREGADO', FALSE, '2025-06-20', '2025-06-05'),
  ('a1000000-0000-0000-0000-000000000067', 'c1a00000-0000-0000-0000-000000000008', 'Uniformes invierno rest.', 'Bordados', 20, 10000, 'ENTREGADO', FALSE, '2025-06-15', '2025-05-28'),
  ('a1000000-0000-0000-0000-000000000068', 'c1a00000-0000-0000-0000-000000000010', 'Equipación torneo', 'Sublimación', 80, 16000, 'ENTREGADO', FALSE, '2025-06-25', '2025-06-10'),
  ('a1000000-0000-0000-0000-000000000069', 'c1a00000-0000-0000-0000-000000000011', 'Gorras temporada', 'Sublimación', 60, 9000, 'ENTREGADO', FALSE, '2025-06-18', '2025-06-01'),
  ('a1000000-0000-0000-0000-000000000070', 'c1a00000-0000-0000-0000-000000000018', 'Delantales cervecería', 'Bordados', 15, 5250, 'ENTREGADO', FALSE, '2025-06-22', '2025-06-08'),

  -- Mayo 2025
  ('a1000000-0000-0000-0000-000000000071', 'c1a00000-0000-0000-0000-000000000001', 'Uniformes otoño', 'Bordados', 30, 10500, 'ENTREGADO', FALSE, '2025-05-20', '2025-05-05'),
  ('a1000000-0000-0000-0000-000000000072', 'c1a00000-0000-0000-0000-000000000004', 'Camisetas corporativas', 'DTF', 55, 13750, 'ENTREGADO', FALSE, '2025-05-15', '2025-04-28'),
  ('a1000000-0000-0000-0000-000000000073', 'c1a00000-0000-0000-0000-000000000012', 'Ropa gym primavera', 'Sublimación', 35, 10500, 'ENTREGADO', FALSE, '2025-05-25', '2025-05-10'),
  ('a1000000-0000-0000-0000-000000000074', 'c1a00000-0000-0000-0000-000000000016', 'Uniformes hospital', 'Bordados', 45, 18000, 'ENTREGADO', FALSE, '2025-05-18', '2025-05-01'),
  ('a1000000-0000-0000-0000-000000000075', 'c1a00000-0000-0000-0000-000000000019', 'Delantales primavera', 'Bordados', 12, 4200, 'ENTREGADO', FALSE, '2025-05-22', '2025-05-08'),

  -- Abril 2025
  ('a1000000-0000-0000-0000-000000000076', 'c1a00000-0000-0000-0000-000000000006', 'Uniformes abril', 'DTF', 50, 15000, 'ENTREGADO', FALSE, '2025-04-20', '2025-04-05'),
  ('a1000000-0000-0000-0000-000000000077', 'c1a00000-0000-0000-0000-000000000017', 'Camisetas promo', 'DTF', 40, 6000, 'ENTREGADO', FALSE, '2025-04-15', '2025-03-28');

-- Pedidos CANCELADOS (3 pedidos)
INSERT INTO orders (id, client_id, description, service_type, quantity, total, status, is_urgent, due_date, created_at) VALUES
  ('a1000000-0000-0000-0000-000000000078', 'c1a00000-0000-0000-0000-000000000020', 'Pedido cancelado por cliente', 'Bordados', 50, 17500, 'CANCELADO', FALSE, '2025-12-15', '2025-11-20'),
  ('a1000000-0000-0000-0000-000000000079', 'c1a00000-0000-0000-0000-000000000003', 'Evento pospuesto indefinidamente', 'DTF', 100, 20000, 'CANCELADO', FALSE, '2025-10-30', '2025-10-10'),
  ('a1000000-0000-0000-0000-000000000080', 'c1a00000-0000-0000-0000-000000000009', 'Cambio de proveedor', 'Sublimación', 30, 9000, 'CANCELADO', FALSE, '2025-09-25', '2025-09-05');

-- ============================================
-- 4. HISTORIAL DE ESTADOS (para pedidos activos)
-- ============================================

-- Historial para pedido ORD-001 (María García - RECIBIDO)
INSERT INTO order_status_history (id, order_id, status, observations, changed_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'RECIBIDO', 'Pedido recibido. Cliente entrega diseño vectorial del logo en formato AI.', '2026-01-18 09:30:00');

-- Historial para pedido ORD-009 (María García - CONFECCION)
INSERT INTO order_status_history (id, order_id, status, observations, changed_at) VALUES
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000009', 'RECIBIDO', 'Pedido recibido con especificaciones de colores.', '2026-01-10 10:00:00'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 'CONFECCION', 'Inicio de producción. Bordado en máquina 3.', '2026-01-12 14:15:00');

-- Historial para pedido ORD-021 (Ana López - RETIRO)
INSERT INTO order_status_history (id, order_id, status, observations, changed_at) VALUES
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000021', 'RECIBIDO', 'Pedido para evento anual. Urgente.', '2025-12-28 09:00:00'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000021', 'CONFECCION', 'Producción iniciada. Sublimación en proceso.', '2025-12-30 11:00:00'),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000021', 'RETIRO', 'Pedido completado. Listo para retiro en local.', '2026-01-18 16:00:00');

-- Historial para pedido PARCIALMENTE_ENTREGADO (ORD-025)
INSERT INTO order_status_history (id, order_id, status, observations, changed_at) VALUES
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000025', 'RECIBIDO', 'Pedido grande de 200 camisetas.', '2024-12-20 10:00:00'),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000025', 'CONFECCION', 'Inicio de producción por lotes.', '2024-12-22 09:00:00'),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000025', 'PARCIALMENTE_ENTREGADO', 'Primera entrega: 80 unidades. Restantes: 120.', '2026-01-10 15:00:00'),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000025', 'PARCIALMENTE_ENTREGADO', 'Segunda entrega: 60 unidades. Restantes: 60.', '2026-01-15 14:00:00');

-- ============================================
-- 5. PAGOS/ABONOS (para varios pedidos)
-- ============================================

-- Pagos para pedido ORD-001 (pagos parciales)
INSERT INTO payments (id, order_id, amount, method, notes, payment_date) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 5000, 'efectivo', 'Seña inicial del 40%', '2026-01-18 09:45:00'),
  ('d1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 3000, 'transferencia', 'Segundo abono', '2026-01-19 14:30:00');

-- Pagos para pedido ORD-009 (pago completo)
INSERT INTO payments (id, order_id, amount, method, notes, payment_date) VALUES
  ('d1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009', 9000, 'transferencia', 'Seña 50%', '2026-01-10 10:30:00'),
  ('d1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000009', 9000, 'efectivo', 'Pago restante', '2026-01-15 11:00:00');

-- Pagos para pedido ORD-021 (completo)
INSERT INTO payments (id, order_id, amount, method, notes, payment_date) VALUES
  ('d1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000021', 12500, 'tarjeta', 'Seña 50%', '2025-12-28 09:30:00'),
  ('d1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000021', 12500, 'efectivo', 'Saldo al retiro', '2026-01-18 16:30:00');

-- Pagos para pedido ORD-025 (parcial - pedido grande)
INSERT INTO payments (id, order_id, amount, method, notes, payment_date) VALUES
  ('d1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000025', 15000, 'transferencia', 'Anticipo inicial', '2024-12-20 11:00:00'),
  ('d1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000025', 10000, 'efectivo', 'Pago en primera entrega', '2026-01-10 15:30:00'),
  ('d1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000025', 8000, 'transferencia', 'Pago segunda entrega', '2026-01-15 14:30:00');

-- Pagos para pedidos entregados (algunos pagados completo)
INSERT INTO payments (id, order_id, amount, method, notes, payment_date) VALUES
  ('d1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000028', 8500, 'efectivo', 'Pago completo', '2025-12-20 10:00:00'),
  ('d1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000029', 12000, 'transferencia', 'Pago completo', '2025-12-25 11:00:00'),
  ('d1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000030', 4500, 'efectivo', 'Pago completo', '2025-12-28 09:00:00'),
  ('d1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000033', 16000, 'tarjeta', 'Pago completo', '2025-12-05 14:00:00'),
  ('d1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000038', 6000, 'efectivo', 'Pago completo', '2025-10-28 10:00:00');

-- ============================================
-- 6. GASTOS (últimos 90 días)
-- ============================================
INSERT INTO expenses (id, expense_type_id, description, amount, date, created_at) VALUES
  -- Enero 2026
  ('e1a00000-0000-0000-0000-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'Pago quincenal enero 2da quincena', 45000, '2026-01-15', '2026-01-15'),
  ('e1a00000-0000-0000-0000-000000000002', 'a1b2c3d4-0001-0001-0001-000000000002', 'Alquiler mensual enero', 120000, '2026-01-01', '2026-01-01'),
  ('e1a00000-0000-0000-0000-000000000003', 'a1b2c3d4-0001-0001-0001-000000000003', 'Pago María - bordados semana 3', 15000, '2026-01-19', '2026-01-19'),
  ('e1a00000-0000-0000-0000-000000000004', 'a1b2c3d4-0001-0001-0001-000000000004', 'Pago Rosa - confección semana 3', 18000, '2026-01-19', '2026-01-19'),
  ('e1a00000-0000-0000-0000-000000000005', 'a1b2c3d4-0001-0001-0001-000000000002', 'Servicios (luz, agua, internet)', 25000, '2026-01-10', '2026-01-10'),
  ('e1a00000-0000-0000-0000-000000000006', 'a1b2c3d4-0001-0001-0001-000000000005', 'Compra de hilos y agujas', 8500, '2026-01-08', '2026-01-08'),
  ('e1a00000-0000-0000-0000-000000000007', 'a1b2c3d4-0001-0001-0001-000000000001', 'Bonificación especial empleado', 10000, '2026-01-05', '2026-01-05'),
  ('e1a00000-0000-0000-0000-000000000008', 'a1b2c3d4-0001-0001-0001-000000000002', 'Reparación máquina bordadora #2', 35000, '2026-01-03', '2026-01-03'),
  ('e1a00000-0000-0000-0000-000000000009', 'a1b2c3d4-0001-0001-0001-000000000003', 'Pago María - bordados semana 2', 15000, '2026-01-12', '2026-01-12'),
  ('e1a00000-0000-0000-0000-000000000010', 'a1b2c3d4-0001-0001-0001-000000000004', 'Pago Rosa - confección semana 2', 18000, '2026-01-12', '2026-01-12'),
  
  -- Diciembre 2025
  ('e1a00000-0000-0000-0000-000000000011', 'a1b2c3d4-0001-0001-0001-000000000001', 'Pago quincenal diciembre 2da', 45000, '2025-12-15', '2025-12-15'),
  ('e1a00000-0000-0000-0000-000000000012', 'a1b2c3d4-0001-0001-0001-000000000001', 'Aguinaldo personal', 90000, '2025-12-20', '2025-12-20'),
  ('e1a00000-0000-0000-0000-000000000013', 'a1b2c3d4-0001-0001-0001-000000000002', 'Alquiler mensual diciembre', 120000, '2025-12-01', '2025-12-01'),
  ('e1a00000-0000-0000-0000-000000000014', 'a1b2c3d4-0001-0001-0001-000000000002', 'Servicios diciembre', 28000, '2025-12-10', '2025-12-10'),
  ('e1a00000-0000-0000-0000-000000000015', 'a1b2c3d4-0001-0001-0001-000000000005', 'Materiales varios fin de año', 45000, '2025-12-05', '2025-12-05'),
  ('e1a00000-0000-0000-0000-000000000016', 'a1b2c3d4-0001-0001-0001-000000000003', 'Pago María diciembre', 60000, '2025-12-28', '2025-12-28'),
  ('e1a00000-0000-0000-0000-000000000017', 'a1b2c3d4-0001-0001-0001-000000000004', 'Pago Rosa diciembre', 72000, '2025-12-28', '2025-12-28'),
  
  -- Noviembre 2025
  ('e1a00000-0000-0000-0000-000000000018', 'a1b2c3d4-0001-0001-0001-000000000001', 'Pago quincenal noviembre 2da', 45000, '2025-11-15', '2025-11-15'),
  ('e1a00000-0000-0000-0000-000000000019', 'a1b2c3d4-0001-0001-0001-000000000002', 'Alquiler mensual noviembre', 120000, '2025-11-01', '2025-11-01'),
  ('e1a00000-0000-0000-0000-000000000020', 'a1b2c3d4-0001-0001-0001-000000000002', 'Servicios noviembre', 24000, '2025-11-10', '2025-11-10'),
  ('e1a00000-0000-0000-0000-000000000021', 'a1b2c3d4-0001-0001-0001-000000000005', 'Compra telas sublimación', 35000, '2025-11-08', '2025-11-08'),
  ('e1a00000-0000-0000-0000-000000000022', 'a1b2c3d4-0001-0001-0001-000000000002', 'Mantenimiento máquinas', 15000, '2025-11-20', '2025-11-20'),
  ('e1a00000-0000-0000-0000-000000000023', 'a1b2c3d4-0001-0001-0001-000000000003', 'Pago María noviembre', 60000, '2025-11-28', '2025-11-28'),
  ('e1a00000-0000-0000-0000-000000000024', 'a1b2c3d4-0001-0001-0001-000000000004', 'Pago Rosa noviembre', 72000, '2025-11-28', '2025-11-28'),
  
  -- Octubre 2025
  ('e1a00000-0000-0000-0000-000000000025', 'a1b2c3d4-0001-0001-0001-000000000001', 'Pago quincenal octubre', 90000, '2025-10-30', '2025-10-30'),
  ('e1a00000-0000-0000-0000-000000000026', 'a1b2c3d4-0001-0001-0001-000000000002', 'Alquiler mensual octubre', 120000, '2025-10-01', '2025-10-01'),
  ('e1a00000-0000-0000-0000-000000000027', 'a1b2c3d4-0001-0001-0001-000000000005', 'Hilos especiales bordado', 22000, '2025-10-15', '2025-10-15'),
  ('e1a00000-0000-0000-0000-000000000028', 'a1b2c3d4-0001-0001-0001-000000000002', 'Servicios octubre', 23000, '2025-10-10', '2025-10-10');

-- ============================================
-- FIN DEL SEED DATA
-- ============================================

-- NOTA IMPORTANTE:
-- Los usuarios de autenticación deben crearse via Supabase Auth UI o API.
-- Para pruebas, crear manualmente:
-- 
-- 1. Usuario ADMIN:
--    Email: admin@bordadosperrino.com
--    Password: Admin123!
--    Metadata: { "first_name": "Admin", "last_name": "Perrino", "role": "ADMIN" }
--
-- 2. Usuario CLIENT (vinculado a María García):
--    Email: maria@email.com
--    Password: Cliente123!
--    Metadata: { "first_name": "María", "last_name": "García", "role": "CLIENT" }
--    Luego actualizar clients SET user_id = (id del usuario creado) WHERE email = 'maria@email.com'
