{{ config(materialized='view') }}

-- Map admin lines to COFOG major (01..10) using weighted mapping.

with lines as (
  select year, mission_code, mission_label, programme_code, programme_label, cp_eur, ae_eur
  from {{ ref('stg_state_budget_lines') }}
),
map_mission as (
  select source_code as mission_code, cofog_code, weight
  from {{ ref('dim_cofog_mapping') }}
  where source = 'mission'
),
joined as (
  select l.year,
         case when length(split_part(m.cofog_code::varchar, '.', 1)) = 1
              then '0' || split_part(m.cofog_code::varchar, '.', 1)
              else split_part(m.cofog_code::varchar, '.', 1)
          end as cofog_major,
         sum(l.cp_eur * m.weight) as cp_eur,
         sum(l.ae_eur * m.weight) as ae_eur
  from lines l
  join map_mission m on m.mission_code = l.mission_code
  group by 1,2
),
labels as (
  select * from (
    values
      ('01','General public services'),
      ('02','Defense'),
      ('03','Public order'),
      ('04','Economic affairs'),
      ('05','Environment'),
      ('06','Housing'),
      ('07','Health'),
      ('08','Recreation, culture'),
      ('09','Education'),
      ('10','Social protection')
  ) as t(code,label)
)
select j.year,
       j.cofog_major as cofog_code,
       coalesce(l.label, j.cofog_major) as cofog_label,
       j.cp_eur,
       j.ae_eur
from joined j
left join labels l on l.code = j.cofog_major
order by year, cofog_code
 
