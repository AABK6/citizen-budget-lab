-- Ensure year-specific programme mappings retain a complete weight distribution.

with weights as (
    select
        programme_code,
        effective_year,
        sum(weight) as total_weight,
        count(*) as entries
    from {{ ref('dim_cofog_mapping') }}
    where source_type = 'programme_year'
      and effective_year = 2026
      and programme_code = '2041'
    group by 1,2
)
select *
from weights
where abs(total_weight - 1.0) > 1e-6
   or entries <> 2
