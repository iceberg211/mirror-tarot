-- 记录模型服务商返回的真实 Token，以及依据价格表换算的人民币成本。
-- 成本字段允许为空：未知模型或未配置价格时仍保留真实 Token。

alter table public.reading_generations
  add column if not exists provider text,
  add column if not exists cached_input_tokens integer,
  add column if not exists input_cost_cny numeric(14, 8),
  add column if not exists output_cost_cny numeric(14, 8),
  add column if not exists total_cost_cny numeric(14, 8),
  add column if not exists pricing_version text;

alter table public.reading_generations
  drop constraint if exists reading_generations_token_usage_nonnegative,
  add constraint reading_generations_token_usage_nonnegative check (
    coalesce(input_tokens, 0) >= 0
    and coalesce(cached_input_tokens, 0) >= 0
    and coalesce(output_tokens, 0) >= 0
  ),
  drop constraint if exists reading_generations_cost_nonnegative,
  add constraint reading_generations_cost_nonnegative check (
    coalesce(input_cost_cny, 0) >= 0
    and coalesce(output_cost_cny, 0) >= 0
    and coalesce(total_cost_cny, 0) >= 0
  );

notify pgrst, 'reload schema';
