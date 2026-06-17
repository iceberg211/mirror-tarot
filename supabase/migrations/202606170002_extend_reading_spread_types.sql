-- 扩展 readings.spread_type 约束，匹配前端新增的镜面十字与自定义牌阵。

alter table if exists public.readings
  drop constraint if exists readings_spread_type_check;

alter table if exists public.readings
  add constraint readings_spread_type_check check (
    spread_type in (
      'one_card',
      'three_cards',
      'relationship',
      'career',
      'shadow',
      'choice',
      'mirror_cross',
      'custom'
    )
  );

notify pgrst, 'reload schema';
