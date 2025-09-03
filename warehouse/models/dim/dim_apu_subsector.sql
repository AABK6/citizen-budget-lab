{{ config(materialized='view') }}

-- Simple APU subsector tagging rules to start with.
-- Central (APUC): all state budget lines and buyers with prefix 'MIN-'
-- Local (APUL) and Social (ASSO): placeholders for future enrichment.

with rules as (
  select 'admin'::varchar as domain, 'mission'::varchar as key_type, null::varchar as key_value, 'APUC'::varchar as apu_subsector
  union all
  select 'proc'::varchar, 'buyer_prefix'::varchar, 'MIN-'::varchar, 'APUC'::varchar
),
admin as (
  select distinct mission_code as key_value, 'admin' as domain, 'mission' as key_type
  from {{ ref('stg_state_budget_lines') }}
),
proc as (
  select distinct buyer_org_id as key_value, 'proc' as domain, 'buyer' as key_type
  from {{ ref('stg_procurement_contracts') }}
),
u as (
  select * from admin
  union all
  select * from proc
),
tagged as (
  select u.domain, u.key_type, u.key_value,
    case when u.domain = 'admin' then 'APUC'
         when u.domain = 'proc' and u.key_value like 'MIN-%' then 'APUC'
         else 'UNKNOWN' end as apu_subsector
  from u
)
select * from tagged
