-- Ozon Express shipping file. The admin sets the defaults once in the settings
-- (pickup city, may the customer open / try the parcel) and can change them
-- per order, with a note for the courier and an "exchange parcel" flag.
-- Customers never see or fill these.

alter table public.store_settings
  add column ozon_pickup_city text not null default 'Casablanca' check (char_length(ozon_pickup_city) <= 80),
  add column ozon_allow_open boolean not null default true,
  add column ozon_allow_try boolean not null default true;

alter table public.orders
  -- null: use the default from the settings.
  add column allow_open boolean,
  add column allow_try boolean,
  add column is_exchange boolean not null default false,
  add column delivery_note text not null default '' check (char_length(delivery_note) <= 300);
