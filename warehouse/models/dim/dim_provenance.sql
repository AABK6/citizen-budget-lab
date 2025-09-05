{{ config(materialized='view') }}

-- Provenance registry combining static sources and warmed cache sidecars

with static_sources as (
  select
    cast(id as varchar) as id,
    cast(dataset_name as varchar) as name,
    cast(url as varchar) as url,
    cast(license as varchar) as license,
    cast(refresh_cadence as varchar) as cadence,
    cast(vintage as varchar) as vintage,
    cast(null as integer) as year,
    'static'::varchar as kind,
    'data/sources.json'::varchar as path
  from read_json_auto('data/sources.json')
),
state_meta as (
  select
    ('state_budget_mission_' || cast(year as varchar)) as id,
    'State budget (mission)' as name,
    cast(base as varchar) as url,
    null::varchar as license,
    'snapshot'::varchar as cadence,
    cast(extraction_ts as varchar) as vintage,
    cast(year as integer) as year,
    'warm'::varchar as kind,
    filename::varchar as path
  from read_json_auto('data/cache/state_budget_mission_*.meta.json', filename=true)
),
decp_meta as (
  select
    ('procurement_contracts_' || cast(year as varchar)) as id,
    'Procurement (DECP consolidated)' as name,
    cast(source as varchar) as url,
    null::varchar as license,
    'ingest'::varchar as cadence,
    cast(extraction_ts as varchar) as vintage,
    cast(year as integer) as year,
    'warm'::varchar as kind,
    filename::varchar as path
  from read_json_auto('data/cache/procurement_contracts_*.meta.json', filename=true)
),
macro_meta as (
  select
    ('macro_series_' || cast(country as varchar)) as id,
    'INSEE macro series (BDM)' as name,
    cast(config as varchar) as url,
    null::varchar as license,
    'warm'::varchar as cadence,
    cast(extraction_ts as varchar) as vintage,
    null::integer as year,
    'warm'::varchar as kind,
    filename::varchar as path
  from read_json_auto('data/cache/macro_series_*.meta.json', filename=true)
)
select * from static_sources
union all
select * from state_meta
union all
select * from decp_meta
union all
select * from macro_meta
