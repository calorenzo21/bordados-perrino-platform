-- 011_delete_functions.sql
-- Hard-delete support for the admin dashboard (delete order / delete client).
--
-- Both functions follow the same shape: they FIRST collect the public URLs
-- of every Storage photo that is about to be removed, THEN delete the rows.
-- They return that list of URLs so the calling API route can clean up the
-- Storage buckets afterwards (the database cannot reach Storage itself).
--
-- Row cascades do the heavy lifting: payments, order_status_history,
-- order_images and their photo tables are all ON DELETE CASCADE from orders;
-- conversations_needing_attention is ON DELETE CASCADE from clients. The only
-- RESTRICT edge is orders.client_id -> clients, which is why a client with
-- orders must have its orders deleted first (handled inside delete_client_hard).
--
-- SECURITY DEFINER so the function runs with table-owner rights; EXECUTE is
-- granted only to service_role (the admin API route, after it has verified
-- the caller is an admin).

-- ── delete_order_cascade ────────────────────────────────────────────────
-- Deletes one order. payments / order_status_history / order_images and
-- their photos cascade automatically.

create or replace function public.delete_order_cascade(p_order_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select osp.photo_url
      from order_status_photos osp
      join order_status_history osh on osh.id = osp.status_history_id
     where osh.order_id = p_order_id
    union all
    select pp.photo_url
      from payment_photos pp
      join payments p on p.id = pp.payment_id
     where p.order_id = p_order_id
    union all
    select oi.image_url
      from order_images oi
     where oi.order_id = p_order_id;

  delete from orders where id = p_order_id;
end;
$$;

comment on function public.delete_order_cascade(uuid) is
  'Permanently deletes one order (payments, status history and images '
  'cascade). Returns the public URLs of the order''s Storage photos so the '
  'caller can clean up the buckets. Admin-only via the service-role client.';

-- ── delete_client_hard ──────────────────────────────────────────────────
-- Deletes a client together with ALL of their orders, in one transaction.

drop function if exists public.delete_client_hard(uuid);

create function public.delete_client_hard(p_client_id uuid)
returns setof text
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select osp.photo_url
      from order_status_photos osp
      join order_status_history osh on osh.id = osp.status_history_id
      join orders o on o.id = osh.order_id
     where o.client_id = p_client_id
    union all
    select pp.photo_url
      from payment_photos pp
      join payments p on p.id = pp.payment_id
      join orders o on o.id = p.order_id
     where o.client_id = p_client_id
    union all
    select oi.image_url
      from order_images oi
      join orders o on o.id = oi.order_id
     where o.client_id = p_client_id;

  delete from orders where client_id = p_client_id;
  delete from clients where id = p_client_id;
end;
$$;

comment on function public.delete_client_hard(uuid) is
  'Permanently deletes a client and all of their orders (payments, status '
  'history and images cascade), in one transaction. Returns the public URLs '
  'of every Storage photo removed. Admin-only via the service-role client.';

-- Lock both functions down to the service role only. Supabase grants EXECUTE
-- to anon + authenticated explicitly on new public functions, so revoking
-- from PUBLIC alone is not enough — revoke from those roles too. Without this
-- a SECURITY DEFINER function would be callable by any logged-in user.
revoke all on function public.delete_order_cascade(uuid) from public, anon, authenticated;
revoke all on function public.delete_client_hard(uuid) from public, anon, authenticated;
grant execute on function public.delete_order_cascade(uuid) to service_role;
grant execute on function public.delete_client_hard(uuid) to service_role;
