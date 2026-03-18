-- Población demo (dashboard): 10 clientes con nombres realistas, 100 pedidos en ~6 meses,
-- historial, pagos variados, gastos de costureras (Ana en verde).
-- Solo borra datos insertados por este seed (no toca clientes/pedidos/gastos previos del negocio).

-- 1) Pedidos y clientes del seed anterior
DELETE FROM orders WHERE client_id IN (
  SELECT id FROM clients
  WHERE email LIKE 'demo_poblacion_%@bordados-perrino.local'
     OR email LIKE '%@bordados-seed.local'
);
DELETE FROM clients
WHERE email LIKE 'demo_poblacion_%@bordados-perrino.local'
   OR email LIKE '%@bordados-seed.local';

-- 2) Gastos insertados por la versión anterior de este script (solo esas descripciones)
DELETE FROM expenses WHERE description IN (
  'Pago semanal confección polos — semana 1',
  'Horas extra bordados corporativos',
  'Confección pedido urgente llaveros',
  'Arreglos y terminación DTF',
  'Pago quincenal noviembre 1ª quincena',
  'Compra de insumos hilo y entretela',
  'Alquiler local — noviembre',
  'Pedido sublimación gorras',
  'Terminación pedido impresión camisetas',
  'Transporte materiales',
  'Servicios básicos luz'
);

-- 3) Tipos costureras; Ana siempre en verde
INSERT INTO expense_types (name, color, is_system)
VALUES
  ('Costurera María', 'bg-pink-500', false),
  ('Costurera Ana', 'bg-green-600', false)
ON CONFLICT (name) DO NOTHING;

UPDATE expense_types SET color = 'bg-green-600' WHERE name = 'Costurera Ana';

-- Borrar gastos de la versión v2 del seed (si se re-ejecuta)
DELETE FROM expenses WHERE description IN (
  'Pago semanal confección — lote polos restaurante',
  'Horas extra terminación bordados corporativos',
  'Confección urgente llaveros sublimados',
  'Terminación y revisión pedido DTF camisetas',
  'Pago quincenal — primera quincena',
  'Pago quincenal costurera María',
  'Pago quincenal costurera Ana',
  'Insumos: hilo, entretela y agujas',
  'Alquiler local (mes)',
  'Sublimación y armado gorras personalizadas',
  'Acabado e impresión textil pedido colegio',
  'Transporte y encomienda materiales',
  'Servicio eléctrico y agua',
  'Insumos varios taller — registro demo panel',
  'Alquiler local — registro demo panel',
  'Servicios básicos — registro demo panel',
  'Transporte materiales — registro demo panel'
);

-- 4) Nuevos gastos demo (fechas repartidas en los últimos ~6 meses)
INSERT INTO expenses (expense_type_id, description, amount, date)
SELECT et.id, v.d, v.amt, (CURRENT_DATE - v.days_ago)::date
FROM (VALUES
  ('Costurera María', 'Pago semanal confección — lote polos restaurante', 295.00, 12),
  ('Costurera María', 'Horas extra terminación bordados corporativos', 168.00, 28),
  ('Costurera Ana', 'Confección urgente llaveros sublimados', 110.00, 8),
  ('Costurera Ana', 'Terminación y revisión pedido DTF camisetas', 132.50, 45),
  ('Costurera María', 'Pago quincenal costurera María', 360.00, 18),
  ('Costurera Ana', 'Pago quincenal costurera Ana', 335.00, 18),
  ('Personal', 'Insumos varios taller — registro demo panel', 94.20, 5),
  ('Castillo', 'Alquiler local — registro demo panel', 480.00, 30),
  ('Costurera María', 'Sublimación y armado gorras personalizadas', 215.00, 52),
  ('Costurera Ana', 'Acabado e impresión textil pedido colegio', 188.00, 61),
  ('Personal', 'Transporte materiales — registro demo panel', 42.00, 22),
  ('Castillo', 'Servicios básicos — registro demo panel', 71.30, 14)
) AS v(etype, d, amt, days_ago)
JOIN expense_types et ON et.name = v.etype;

DO $$
DECLARE
  admin_id uuid;
  cid uuid;
  oid uuid;
  ord_total numeric(12,2);
  q int;
  st order_status;
  svc service_type;
  path order_status[];
  i int;
  j int;
  k int;
  sl int;
  pm payment_method;
  idx int;
  days_ago int;
  created_ts timestamptz;
  step_days numeric;
  hist_ts timestamptz;
  descr text;
  due_d date;
  svcs service_type[] := ARRAY['Bordados','Sublimación','DTF','Impresión','Llaveros','Impresión y Planchado','Impresión, Planchado y Tela']::service_type[];
  -- Nombres y correos únicos del seed
  cnames text[] := ARRAY[
    'Rosa Elena Villacrés',
    'José Luis Pacheco',
    'Ana Lucía Verdugo',
    'Marco Intriago',
    'Patricia Molina',
    'Fernando Espinoza',
    'Daniela Rodríguez',
    'Luis Alberto Cedeño',
    'Gabriela Ochoa',
    'Ricardo Zambrano'
  ];
  cemails text[] := ARRAY[
    'r.villacres@bordados-seed.local',
    'jlpacheco@bordados-seed.local',
    'ana.verdugo@bordados-seed.local',
    'marco.intriago@bordados-seed.local',
    'p.molina@bordados-seed.local',
    'f.espinoza@bordados-seed.local',
    'd.rodriguez@bordados-seed.local',
    'l.cedeno@bordados-seed.local',
    'g.ochoa@bordados-seed.local',
    'r.zambrano@bordados-seed.local'
  ];
BEGIN
  SELECT id INTO admin_id FROM profiles WHERE role = 'ADMIN'::user_role LIMIT 1;
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere al menos un perfil ADMIN para historial y pagos demo.';
  END IF;

  FOR i IN 1..10 LOOP
    INSERT INTO clients (name, email, phone, cedula, address, notes)
    VALUES (
      cnames[i],
      cemails[i],
      '09' || lpad((8720000 + i * 13)::text, 8, '0'),
      lpad((1750000000 + i * 17)::text, 10, '0'),
      CASE (i % 4)
        WHEN 0 THEN 'Av. 6 de Diciembre, Quito'
        WHEN 1 THEN 'Cdla. Kennedy Norte, Guayaquil'
        WHEN 2 THEN 'Centro histórico, Cuenca'
        ELSE 'Av. Amazonas, Quito'
      END,
      'Contacto generado para pruebas del panel (seed).'
    ) RETURNING id INTO cid;

    FOR j IN 1..10 LOOP
      idx := (i - 1) * 10 + (j - 1);
      -- ~6 meses hacia atrás; más pedidos concentrados en semanas recientes (mejor curva en dashboard)
      days_ago := LEAST(183, GREATEST(0, FLOOR(183 * power((99.0 - idx) / 99.0, 2))::int + (idx % 3)));
      created_ts := NOW() - (days_ago || ' days')::interval - ((idx % 11) || ' hours')::interval;

      q := 12 + ((i * 17 + j * 11) % 88);
      ord_total := round((52 + (i + j) * 11.25 + (i * j) * 0.45)::numeric, 2);
      svc := svcs[1 + ((i + j) % 7)];

      -- Pedidos antiguos (meses atrás): ENTREGADO para no marcar cientos de días tarde.
      -- Pedidos recientes: estados variados y due_date cerca de hoy (futuro / leve retraso).
      IF idx <= 72 THEN
        st := 'ENTREGADO';
        path := ARRAY['RECIBIDO','CONFECCION','RETIRO','ENTREGADO']::order_status[];
        due_d := (created_ts::date + 8 + (idx % 14));
      ELSIF idx <= 78 AND (i + j) % 11 = 0 THEN
        st := 'CANCELADO';
        IF (i + j) % 2 = 0 THEN path := ARRAY['RECIBIDO','CANCELADO']::order_status[];
        ELSE path := ARRAY['RECIBIDO','CONFECCION','CANCELADO']::order_status[];
        END IF;
        due_d := (created_ts::date + 18);
      ELSE
        st := (ARRAY[
          'RECIBIDO','CONFECCION','RETIRO','PARCIALMENTE_ENTREGADO',
          'ENTREGADO','CONFECCION','RETIRO','RECIBIDO'
        ]::order_status[])[1 + ((i + j + idx) % 8)];
        IF st = 'RECIBIDO' THEN path := ARRAY['RECIBIDO']::order_status[];
        ELSIF st = 'CONFECCION' THEN path := ARRAY['RECIBIDO','CONFECCION']::order_status[];
        ELSIF st = 'RETIRO' THEN path := ARRAY['RECIBIDO','CONFECCION','RETIRO']::order_status[];
        ELSIF st = 'PARCIALMENTE_ENTREGADO' THEN path := ARRAY['RECIBIDO','CONFECCION','RETIRO','PARCIALMENTE_ENTREGADO']::order_status[];
        ELSIF st = 'ENTREGADO' THEN path := ARRAY['RECIBIDO','CONFECCION','RETIRO','ENTREGADO']::order_status[];
        ELSE path := ARRAY['RECIBIDO','CONFECCION','RETIRO','ENTREGADO']::order_status[];
        END IF;
        IF st = 'ENTREGADO' THEN
          due_d := (CURRENT_DATE - (2 + (idx % 8)));
        ELSE
          due_d := (CURRENT_DATE + (1 + ((idx * 2 + j * 5) % 25)));
        END IF;
      END IF;

      descr := CASE svc
        WHEN 'Bordados' THEN (ARRAY[
          'Polos corporativos con logo bordado en pecho (mismo diseño en todas las tallas).',
          'Uniformes escolares: escudo bordado en saco y pantalón.',
          'Chaquetas deportivas con nombre y número bordado en espalda.',
          'Manteles de lino con detalle floral bordado para evento.',
          'Gorras con monograma bordado — regalos empresa.',
          'Toallas con iniciales bordadas para lista de matrimonio.',
          'Parches bordados para equipo de trabajo en campo.'
        ])[(idx % 7) + 1]
        WHEN 'Sublimación' THEN (ARRAY[
          'Tazas sublimadas con foto y texto — obsequio corporativo.',
          'Polos full print sublimado, diseño aportado por el cliente.',
          'Placas metálicas sublimadas para trofeos y reconocimientos.',
          'Almohadas personalizadas sublimación doble cara.',
          'Botellas térmicas con imagen sublimada.',
          'Delantales sublimados para personal de cocina.'
        ])[(idx % 6) + 1]
        WHEN 'DTF' THEN (ARRAY[
          'Transfer DTF en camisetas oscuras — diseño a full color.',
          'DTF en sudaderas y hoodies, tiraje medio.',
          'Etiquetas DTF para merchandising de marca local.',
          'Camisetas negras con DTF resistente al lavado.',
          'Pedido mixto: polos y tote bags con mismo arte DTF.'
        ])[(idx % 5) + 1]
        WHEN 'Impresión' THEN (ARRAY[
          'Impresión digital en papel couché para flyers promocionales.',
          'Afiches tamaño A2 para campaña temporal.',
          'Tarjetas de presentación y volantes a dos caras.',
          'Stickers troquelados para packaging.',
          'Menú impreso plastificado para restaurante.'
        ])[(idx % 5) + 1]
        WHEN 'Llaveros' THEN (ARRAY[
          'Llaveros sublimados redondos — 50 unidades mismo diseño.',
          'Llaveros rectangulares con logo para feria.',
          'Llaveros acrílicos personalizados pedido colegio.',
          'Set promocional llaveros + imán nevera.'
        ])[(idx % 4) + 1]
        WHEN 'Impresión y Planchado' THEN (ARRAY[
          'Camisetas blancas: impresión y planchado de logo institucional.',
          'Polos con transfer y planchado industrial — lote escolar.',
          'Pedido deportivo: impresión número y planchado termoadhesivo.'
        ])[(idx % 3) + 1]
        ELSE (ARRAY[
          'Conjunto tela + impresión + planchado para uniformes clínica.',
          'Delantales tela con bolsillo e impresión a color.',
          'Mandiles personalizados para taller de belleza.'
        ])[(idx % 3) + 1]
      END;

      INSERT INTO orders (client_id, description, service_type, quantity, total, status, is_urgent, due_date, created_at, updated_at)
      VALUES (
        cid,
        descr,
        svc,
        q,
        ord_total,
        st,
        (idx > 75) AND ((i + j) % 6) = 0,
        due_d,
        created_ts,
        created_ts + interval '2 hours'
      ) RETURNING id INTO oid;

      step_days := GREATEST(0.5, LEAST(8.0, 25.0 / NULLIF(array_length(path, 1), 0)));
      FOR k IN 1..array_length(path, 1) LOOP
        hist_ts := created_ts + (((k - 1) * step_days) || ' days')::interval + ((k * 3) || ' hours')::interval;
        INSERT INTO order_status_history (order_id, status, observations, changed_by, changed_at, quantity_delivered)
        VALUES (
          oid, path[k],
          CASE k WHEN 1 THEN 'Pedido ingresado al taller.' ELSE 'Actualización de estado en producción.' END,
          admin_id, hist_ts,
          CASE WHEN path[k] = 'PARCIALMENTE_ENTREGADO' THEN GREATEST(1, q / 2) ELSE NULL END
        );
      END LOOP;

      IF idx <= 72 THEN
        sl := 3;
      ELSE
        sl := idx % 4;
      END IF;
      pm := (ARRAY['efectivo','transferencia','tarjeta','otro']::payment_method[])[1 + (sl % 4)];

      IF sl = 0 THEN
        NULL;
      ELSIF sl = 1 THEN
        INSERT INTO payments (order_id, amount, method, notes, received_by, payment_date)
        VALUES (oid, round(ord_total * 0.30, 2), pm, 'Abono inicial acordado.', admin_id, created_ts + interval '4 days');
      ELSIF sl = 2 THEN
        INSERT INTO payments (order_id, amount, method, notes, received_by, payment_date)
        VALUES (oid, round(ord_total * 0.40, 2), 'efectivo', 'Primer abono', admin_id, created_ts + interval '3 days');
        INSERT INTO payments (order_id, amount, method, notes, received_by, payment_date)
        VALUES (oid, round(ord_total * 0.25, 2), 'transferencia', 'Segundo abono', admin_id, created_ts + interval '12 days');
      ELSE
        INSERT INTO payments (order_id, amount, method, notes, received_by, payment_date)
        VALUES (oid, ord_total, (ARRAY['efectivo','transferencia']::payment_method[])[1 + (j % 2)], 'Pago completo del pedido.', admin_id, created_ts + interval '8 days');
      END IF;
    END LOOP;
  END LOOP;
END $$;
