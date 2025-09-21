{{ config(materialized='view') }}

with base as (
    select
        year,
        apu_subsector,
        sum(ae_eur) as ae_eur,
        sum(cp_eur) as cp_eur
    from {{ ref('fct_admin_by_mission') }}
    group by 1, 2
)
select * from base
