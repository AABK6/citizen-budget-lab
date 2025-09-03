{{ config(materialized='view') }}

select
  cast(source as varchar) as source,
  cast(source_code as varchar) as source_code,
  cast(cofog_code as varchar) as cofog_code,
  cast(weight as double) as weight,
  cast(notes as varchar) as notes
from {{ ref('mapping_state_to_cofog') }}
where weight is not null
