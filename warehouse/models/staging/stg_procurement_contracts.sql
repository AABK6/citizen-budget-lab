{{ config(materialized='view') }}

with raw_cache as (
  select * from read_csv_auto('{{ var('procurement_glob') }}', header=true)
),
cache_typed as (
  select
    cast(contract_id as varchar) as contract_id,
    cast(buyer_org_id as varchar) as buyer_org_id,
    cast(supplier_siren as varchar) as supplier_siren,
    cast(supplier_name as varchar) as supplier_name,
    try_cast(signed_date as date) as signed_date,
    try_cast(amount_eur as double) as amount_eur,
    cast(cpv_code as varchar) as cpv_code,
    cast(procedure_type as varchar) as procedure_type,
    try_cast(lot_count as integer) as lot_count,
    cast(location_code as varchar) as location_code,
    try_cast(year as integer) as year
  from raw_cache
),
raw_sample as (
  select * from read_csv_auto('{{ var('procurement_sample') }}', header=true)
),
sample_typed as (
  select
    cast(contract_id as varchar) as contract_id,
    cast(buyer_org_id as varchar) as buyer_org_id,
    cast(supplier_siren as varchar) as supplier_siren,
    cast(supplier_name as varchar) as supplier_name,
    try_cast(signed_date as date) as signed_date,
    try_cast(amount_eur as double) as amount_eur,
    cast(cpv_code as varchar) as cpv_code,
    cast(procedure_type as varchar) as procedure_type,
    try_cast(lot_count as integer) as lot_count,
    cast(location_code as varchar) as location_code,
    extract(year from try_cast(signed_date as date)) as year
  from raw_sample
),
unioned as (
  select * from cache_typed
  union all
  select * from sample_typed
)
select * from unioned
