-- First collection: one coat. Everything here is editable from the admin panel.
-- The images point at placeholders in /public until the photoshoot is uploaded.

with coat as (
  insert into public.products (
    slug, name_fr, name_ar, subtitle_fr, subtitle_ar,
    description_fr, description_ar, details_fr, details_ar,
    color_name_fr, color_name_ar, color_hex, price_mad, is_published, position
  )
  values (
    'manteau-perle',
    'Le Manteau Perle',
    'معطف اللؤلؤة',
    'Tweed bleu poudré, col bijou',
    'تويد أزرق بودري، ياقة مرصّعة',
    'Coupé dans un tweed bleu poudré, ce manteau long épouse la silhouette puis tombe avec fluidité. Son grand col pointu est rehaussé de bijoux dorés et perlés, ses boutons-bijoux et ses poches cloutées en font une pièce d''exception : pensée pour être portée, remarquée, et gardée.',
    'مُفصّل من قماش التويد بلون أزرق بودري، يحتضن هذا المعطف الطويل القوام ثم ينسدل بانسيابية. ياقته المدببة الكبيرة مزيّنة بحُليّ ذهبية ولؤلؤية، وأزراره المرصّعة وجيوبه المزخرفة تجعل منه قطعة استثنائية: صُمّم ليُلبَس، ويلفت الأنظار، ويدوم.',
    E'Tweed texturé bleu poudré\nGrand col pointu orné de bijoux dorés et perlés\nBoutons-bijoux dorés au cœur nacré\nPoches à rabat cloutées d''or\nCoupe longue et ajustée',
    E'تويد بملمس غني بلون أزرق بودري\nياقة مدببة كبيرة مزيّنة بحُليّ ذهبية ولؤلؤية\nأزرار ذهبية مرصّعة بقلب لؤلؤي\nجيوب بغطاء مزيّنة بمسامير ذهبية\nقصّة طويلة ومحدّدة للقوام',
    'Bleu poudré',
    'أزرق بودري',
    '#B9C5D4',
    1500,
    true,
    0
  )
  returning id
),
sizes as (
  insert into public.product_sizes (product_id, label, stock, position)
  select coat.id, s.label, 5, s.position
    from coat, (values ('S', 0), ('M', 1), ('L', 2), ('XL', 3)) as s(label, position)
  returning id
)
-- Gallery photos only: without close-ups, the home page has no "Les détails" section.
insert into public.product_images (
  product_id, path, role, alt_fr, alt_ar, title_fr, title_ar, caption_fr, caption_ar, position
)
select coat.id, i.path, 'gallery', i.alt_fr, i.alt_ar, '', '', '', '', i.position
  from coat, (values
    ('/placeholders/perle-main.jpg', 'Le Manteau Perle porté', 'معطف اللؤلؤة ملبوساً', 0),
    ('/placeholders/collar.jpg', 'Col orné de bijoux dorés et perlés', 'ياقة مزيّنة بحُليّ ذهبية ولؤلؤية', 1),
    ('/placeholders/buttons.jpg', 'Boutons-bijoux dorés au cœur nacré', 'أزرار ذهبية بقلب لؤلؤي', 2),
    ('/placeholders/pocket.jpg', 'Poche à rabat cloutée d''or', 'جيب بغطاء مزيّن بمسامير ذهبية', 3)
  ) as i(path, alt_fr, alt_ar, position);

-- Customer service on WhatsApp (06 50 36 94 37), editable in the admin settings.
update public.store_settings set whatsapp_number = '212650369437';
