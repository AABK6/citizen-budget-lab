{{ config(materialized='table') }}

-- Map admin lines to COFOG major (01..10) using a hierarchical fallback logic:
-- 1. Year-specific programme mapping
-- 2. Generic programme mapping
-- 3. Mission mapping

with lines as (
    select
        year,
        mission_code,
        mission_label,
        programme_code,
        programme_label,
        cp_eur,
        ae_eur
    from {{ ref('stg_state_budget_lines') }}
),
mapping as (
    select * from {{ ref('dim_cofog_mapping') }}
),
-- 1. Join on year-specific programme code
join_prog_year as (
    select
        l.*,
        m.cofog_code,
        m.weight
    from lines l
    join mapping m
        on l.programme_code = m.programme_code and l.year = m.effective_year
    where m.source_type = 'programme_year'
),
-- 2. Join on generic programme code for lines that didn't match (1)
join_prog as (
    select
        l.*,
        m.cofog_code,
        m.weight
    from lines l
    left join join_prog_year matched on l.programme_code = matched.programme_code and l.year = matched.year
    join mapping m on l.programme_code = m.programme_code
    where matched.programme_code is null and m.source_type = 'programme' and m.effective_year is null
),
-- 3. Join on mission code for lines that didn't match (1) or (2)
join_mission as (
    select
        l.*,
        m.cofog_code,
        m.weight
    from lines l
    left join join_prog_year matched1 on l.programme_code = matched1.programme_code and l.year = matched1.year
    left join join_prog matched2 on l.programme_code = matched2.programme_code and l.year = matched2.year
    join mapping m on l.mission_code = m.mission_code
    where matched1.programme_code is null and matched2.programme_code is null and m.source_type = 'mission'
),
-- Union all matched lines
unioned as (
    select year, cofog_code, weight, cp_eur, ae_eur from join_prog_year
    union all
    select year, cofog_code, weight, cp_eur, ae_eur from join_prog
    union all
    select year, cofog_code, weight, cp_eur, ae_eur from join_mission
),
-- Final aggregation
aggregated as (
    select
        year,
        case
            when length(split_part(cofog_code::varchar, '.', 1)) = 1
            then '0' || split_part(cofog_code::varchar, '.', 1)
            else split_part(cofog_code::varchar, '.', 1)
        end as cofog_major,
        sum(cp_eur * weight) as cp_eur,
        sum(ae_eur * weight) as ae_eur
    from unioned
    group by 1, 2
),
labels as (
    select * from (
        values
            ('01', 'General public services'),
            ('02', 'Defense'),
            ('03', 'Public order'),
            ('04', 'Economic affairs'),
            ('05', 'Environment'),
            ('06', 'Housing'),
            ('07', 'Health'),
            ('08', 'Recreation, culture'),
            ('09', 'Education'),
            ('10', 'Social protection')
    ) as t(code, label)
)
select
    a.year,
    a.cofog_major as cofog_code,
    coalesce(l.label, a.cofog_major) as cofog_label,
    a.cp_eur,
    a.ae_eur
from aggregated a
left join labels l on l.code = a.cofog_major
order by year, cofog_code
 
