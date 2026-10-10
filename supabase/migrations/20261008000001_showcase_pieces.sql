-- Pieces shown in the collection as sold out ("Rupture de stock"): a photo kept
-- mostly hidden under a dark veil, a name and a price. They cannot be ordered;
-- the coat on sale stays in public.products.

create table public.showcase_pieces (
  id uuid primary key default gen_random_uuid(),
  -- Storage path in the product-media bucket, or a site-relative URL ("/placeholders/...").
  image_path text not null,
  name_fr text not null default '' check (length(name_fr) <= 120),
  name_ar text not null default '' check (length(name_ar) <= 120),
  price_mad integer not null default 0 check (price_mad >= 0),
  is_published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.showcase_pieces enable row level security;

create policy "published showcase pieces are public" on public.showcase_pieces
  for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy "admins manage showcase pieces" on public.showcase_pieces
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.showcase_pieces from anon;
grant select on public.showcase_pieces to anon;
grant select, insert, update, delete on public.showcase_pieces to authenticated;
grant all on public.showcase_pieces to service_role;

-- The first pieces, with placeholder photos until the real ones are uploaded.
insert into public.showcase_pieces (image_path, name_fr, name_ar, price_mad, is_published, position)
values
  ('/placeholders/camel-front.jpg', 'Le Manteau Camel', 'معطف كاميل', 1000, true, 0),
  ('/placeholders/showcase-ruban.jpg', 'Le Manteau Ruban', 'معطف الشرائط', 1500, true, 1),
  ('/placeholders/showcase-rose.jpg', 'Le Manteau Rose', 'معطف وردي', 1500, true, 2),
  ('/placeholders/showcase-creme.jpg', 'Le Manteau Crème', 'معطف كريمي', 1500, true, 3);
