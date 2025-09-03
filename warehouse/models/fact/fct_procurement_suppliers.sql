{{ config(materialized='view') }}

-- Supplier-level rollup with simple dedup/aggregation. Derived competition flag.

with base as (
  select
    year,
    supplier_siren,
    any_value(supplier_name) as supplier_name,
    sum(coalesce(amount_eur, 0)) as amount_eur,
    any_value(cpv_code) as cpv_code,
    any_value(procedure_type) as procedure_type,
    any_value(location_code) as location_code,
    sum(coalesce(lot_count, 0)) as lot_count
  from {{ ref('stg_procurement_contracts') }}
  group by 1,2
),
final as (
  select
    year,
    supplier_siren,
    supplier_name,
    amount_eur,
    cpv_code,
    procedure_type,
    location_code,
    lot_count,
    case when lower(coalesce(procedure_type,'')) = 'open' and coalesce(lot_count,0) >= 2 then true else false end as competition_flag
  from base
)
select * from final
