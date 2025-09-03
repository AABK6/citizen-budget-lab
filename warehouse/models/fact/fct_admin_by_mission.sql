{{ config(materialized='view') }}

with base as (
  select year, mission_code, mission_label,
         sum(ae_eur) as ae_eur,
         sum(cp_eur) as cp_eur
  from {{ ref('stg_state_budget_lines') }}
  group by 1,2,3
)
select * from base
