-- Sela Cerita: multi-product catalog foundation
-- Safe to run after the original schema.sql. Existing Wedding IDs remain unchanged.

alter table public.templates
  add column if not exists product_line text not null default 'wedding',
  add column if not exists category text,
  add column if not exists price integer not null default 0,
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table public.templates
  drop constraint if exists templates_product_line_check;

alter table public.templates
  add constraint templates_product_line_check
  check (product_line in ('wedding', 'mini_stories'));

alter table public.templates
  drop constraint if exists templates_price_check;

alter table public.templates
  add constraint templates_price_check
  check (price >= 0);

create index if not exists templates_product_line_active_idx
  on public.templates (product_line, is_active);

-- Wedding records are explicitly classified; stable IDs are preserved.
update public.templates
set product_line = 'wedding',
    category = coalesce(category, 'wedding')
where id in ('bloom', 'chapter', 'playdate');

-- Mini Stories catalog. Rp25.000 is the proposed launch price for this line.
insert into public.templates
  (id, name, description, product_line, category, price, config, is_active)
values
  ('ms_journey', 'Our Little Journey',
   'A playful timeline of the little moments that became your story.',
   'mini_stories', 'anniversary', 25000,
   '{"max_photos":5,"max_message_chars":1500,"themes":["citrus","berry","sky","confetti"]}'::jsonb, true),
  ('ms_open_when', 'Open When',
   'A collection of little letters for every kind of day.',
   'mini_stories', 'letters', 25000,
   '{"max_photos":5,"max_message_chars":1500,"themes":["citrus","berry","sky","confetti"]}'::jsonb, true),
  ('ms_day_for_you', 'A Day for You',
   'A colorful little page made to celebrate one special person.',
   'mini_stories', 'birthday', 25000,
   '{"max_photos":5,"max_message_chars":1500,"themes":["citrus","berry","sky","confetti"]}'::jsonb, true),
  ('ms_just_because', 'Just Because',
   'A surprise page for no reason other than making someone smile.',
   'mini_stories', 'personal', 25000,
   '{"max_photos":5,"max_message_chars":1500,"themes":["citrus","berry","sky","confetti"]}'::jsonb, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  product_line = excluded.product_line,
  category = excluded.category,
  price = excluded.price,
  config = excluded.config,
  is_active = excluded.is_active;

-- Note: this migration only extends the catalog. It does not route Mini Stories
-- projects into the Wedding editor or change order/payment/publishing permissions.
