-- 013_clients_optional_email.sql
-- Permite crear clientes sin correo electrónico.
--
-- Regla de negocio: un cliente puede tener correo, teléfono, o ambos. Lo único
-- que NO se permite es que falten los dos. La cuenta de Supabase Auth solo se
-- crea cuando hay correo (eso lo maneja la ruta API, no la base de datos).
--
-- Hasta ahora `clients.email` y `clients.phone` eran NOT NULL. Se relajan ambos
-- y se añade un CHECK que garantiza que al menos uno esté presente.

ALTER TABLE clients ALTER COLUMN email DROP NOT NULL;
ALTER TABLE clients ALTER COLUMN phone DROP NOT NULL;

-- Idempotente: DROP previo porque ADD CONSTRAINT no soporta IF NOT EXISTS y
-- abortaría al re-ejecutar la migración.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_or_phone_present;
ALTER TABLE clients
  ADD CONSTRAINT clients_email_or_phone_present
  CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- El índice idx_clients_email (001) no es UNIQUE, así que admite varios NULL
-- sin conflicto. No se requieren cambios de índices.
