-- Ensure default programme mappings still sum to unity when no year override is applied.

with weights as (
    select
        programme_code,
        sum(weight) as total_weight
    from {{ ref('dim_cofog_mapping') }}
    where source_type = 'programme_year'
      and effective_year is null
      and programme_code = '2041'
    group by 1
)
select *
from weights
where abs(total_weight - 1.0) > 1e-6
