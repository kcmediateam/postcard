-- Widen the designs.template_kind check to all six template kinds.
-- The original schema only allowed just_listed/just_sold/open_house, so
-- saving Meet Your Neighbor / Coming Soon / Market Update designs failed with
-- "violates check constraint designs_template_kind_check". Run once in the
-- Supabase SQL editor.

alter table public.designs
  drop constraint if exists designs_template_kind_check;

alter table public.designs
  add constraint designs_template_kind_check
  check (
    template_kind in (
      'just_listed',
      'just_sold',
      'coming_soon',
      'open_house',
      'market_update',
      'neighbor_intro'
    )
  );
