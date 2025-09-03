{{ config(materialized='view') }}

with raw as (
  -- Load all warmed mission-level CSVs if present
  select *
  from read_csv_auto('{{ var('state_budget_glob') }}', header=true)
  union all
  -- Include sample data to ensure dev usability
  select *
  from read_csv_auto('{{ var('state_budget_sample') }}', header=true)
),
typed as (
  select
    cast(year as integer) as year,
    cast(mission_code as varchar) as mission_code,
    cast(mission_label as varchar) as mission_label,
    cast(programme_code as varchar) as programme_code,
    cast(programme_label as varchar) as programme_label,
    cast(null as varchar) as action_code,
    cast(null as varchar) as action_label,
    try_cast(ae_eur as double) as ae_eur,
    try_cast(cp_eur as double) as cp_eur,
    cast(null as double) as executed_eur,
    cast(null as varchar) as budget_vert_tag,
    cast(null as varchar) as source_id,
    now() as updated_at
  from raw
)
select * from typed
