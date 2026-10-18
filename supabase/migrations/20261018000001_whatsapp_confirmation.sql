-- Order confirmation over WhatsApp: the shop sends a message with "Oui" and
-- "Non" buttons when an order is placed, and the customer's answer confirms or
-- cancels it.

alter table public.orders
  add column whatsapp_confirmation text not null default 'none'
    check (whatsapp_confirmation in ('none', 'sent', 'confirmed', 'declined')),
  add column whatsapp_sent_at timestamptz;

create index orders_whatsapp_pending_idx on public.orders (phone, created_at desc)
  where whatsapp_confirmation = 'sent';

-- The status change itself, shared by the admin and by WhatsApp answers:
-- cancelling puts the items back in stock, un-cancelling takes them out again.
-- Only callable from other functions.
create or replace function public.apply_order_status(
  p_order_id uuid,
  p_status text,
  p_note text,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if p_status not in ('new', 'confirmed', 'shipped', 'delivered', 'cancelled', 'exchanged') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if v_order.status = p_status then
    return;
  end if;

  perform 1
     from public.product_sizes s
    where s.id in (select i.size_id from public.order_items i where i.order_id = p_order_id)
    order by s.id
      for update;

  if p_status = 'cancelled' then
    update public.product_sizes s
       set stock = s.stock + x.qty
      from (select size_id, sum(quantity)::integer as qty
              from public.order_items
             where order_id = p_order_id and size_id is not null
             group by size_id) x
     where s.id = x.size_id;
  elsif v_order.status = 'cancelled' then
    if exists (
      select 1
        from (select size_id, sum(quantity)::integer as qty
                from public.order_items
               where order_id = p_order_id and size_id is not null
               group by size_id) x
        join public.product_sizes s on s.id = x.size_id
       where s.stock < x.qty
    ) then
      raise exception 'OUT_OF_STOCK';
    end if;
    update public.product_sizes s
       set stock = s.stock - x.qty
      from (select size_id, sum(quantity)::integer as qty
              from public.order_items
             where order_id = p_order_id and size_id is not null
             group by size_id) x
     where s.id = x.size_id;
  end if;

  update public.orders set status = p_status where id = p_order_id;

  insert into public.order_events (order_id, kind, message, data, created_by)
  values (
    p_order_id,
    'status',
    coalesce(p_note, ''),
    jsonb_build_object('from', v_order.status, 'to', p_status),
    p_actor
  );
end;
$$;

revoke all on function public.apply_order_status(uuid, text, text, uuid) from public, anon, authenticated;

create or replace function public.admin_set_order_status(
  p_order_id uuid,
  p_status text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  perform public.apply_order_status(p_order_id, p_status, p_note, (select auth.uid()));
end;
$$;

-- The customer's answer to the confirmation message. Only counts once, from
-- the phone the order was placed with, while the order awaits an answer.
-- Returns 'confirmed', 'declined' or 'ignored'.
create or replace function public.whatsapp_answer(
  p_order_id uuid,
  p_phone text,
  p_answer text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.phone <> p_phone or v_order.whatsapp_confirmation <> 'sent' then
    return 'ignored';
  end if;

  if p_answer = 'yes' then
    update public.orders set whatsapp_confirmation = 'confirmed' where id = p_order_id;
    if v_order.status = 'new' then
      perform public.apply_order_status(p_order_id, 'confirmed', 'Confirmée par la cliente sur WhatsApp', null);
    end if;
    return 'confirmed';
  elsif p_answer = 'no' then
    update public.orders set whatsapp_confirmation = 'declined' where id = p_order_id;
    if v_order.status in ('new', 'confirmed') then
      perform public.apply_order_status(p_order_id, 'cancelled', 'Annulée par la cliente sur WhatsApp', null);
    end if;
    return 'declined';
  end if;
  return 'ignored';
end;
$$;

revoke all on function public.whatsapp_answer(uuid, text, text) from public, anon, authenticated;
grant execute on function public.whatsapp_answer(uuid, text, text) to service_role;
