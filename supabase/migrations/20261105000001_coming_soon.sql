-- "Bientôt disponible" mode: while it is on, visitors see a teaser page
-- instead of the collection. The admin turns it on and off in the settings.

alter table public.store_settings
  add column coming_soon boolean not null default false;

create or replace function public.get_public_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'payments', jsonb_build_object(
      'cod', s.cod_enabled,
      'bank_transfer', s.bank_transfer_enabled,
      'card', s.card_enabled
    ),
    'whatsapp_number', s.whatsapp_number,
    'contact_email', s.contact_email,
    'instagram_url', s.instagram_url,
    'tiktok_url', s.tiktok_url,
    'facebook_url', s.facebook_url,
    'shipping_fee_mad', s.shipping_fee_mad,
    'meta_pixel_id', s.meta_pixel_id,
    'tiktok_pixel_id', s.tiktok_pixel_id,
    'coming_soon', s.coming_soon
  )
  from public.store_settings s
  where s.id;
$$;
