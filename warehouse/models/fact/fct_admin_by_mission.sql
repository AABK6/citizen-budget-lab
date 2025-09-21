{{ config(materialized='view') }}

with base as (
    select
        year,
        mission_code,
        mission_label,
        sum(ae_eur) as ae_eur,
        sum(cp_eur) as cp_eur
    from {{ ref('stg_state_budget_lines') }}
    group by 1, 2, 3
),
tagged as (
    select
        b.year,
        b.mission_code,
        b.mission_label,
        coalesce(a.apu_subsector, 'APUC') as apu_subsector,
        b.ae_eur,
        b.cp_eur
    from base b
    left join {{ ref('dim_apu_entities') }} a
        on a.domain = 'admin'
       and a.key_type = 'mission_code'
       and a.key_value = b.mission_code
)
select * from tagged
