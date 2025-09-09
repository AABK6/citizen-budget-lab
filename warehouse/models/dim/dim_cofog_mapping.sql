{{ config(materialized='table') }}

-- Staging for COFOG mapping, enriching with programme details for joins.
-- This model is the foundation for the year/programme/mission fallback logic.

with source as (
    select
        cast(source as varchar) as source_type,
        "year" as effective_year,
        cast(mission_code as varchar) as mission_code,
        cast(programme_code as varchar) as programme_code,
        cast(cofog_code as varchar) as cofog_code,
        cast(weight as double) as weight
    from {{ ref('mapping_state_to_cofog') }}
    where weight is not null
),
-- Get programme details (mission_code, labels) to enrich programme-level mappings
-- for easier joins in the fact model.
programme_details as (
    select distinct
        programme_code,
        programme_label,
        mission_code,
        mission_label
    from {{ ref('stg_state_budget_lines') }}
)
select
    s.source_type,
    s.effective_year,
    -- For programme-level mappings, fill in the mission_code from budget lines
    coalesce(s.mission_code, p.mission_code) as mission_code,
    s.programme_code,
    s.cofog_code,
    s.weight,
    p.mission_label,
    p.programme_label
from source s
left join programme_details p on s.programme_code = p.programme_code
