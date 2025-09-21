{{ config(materialized='view') }}

with src as (
    select * from read_csv_auto('{{ var('plf_2026_plafonds_csv') }}', header=true)
)

select
    cast(year as integer) as year,
    cast(mission_code as varchar) as mission_code,
    cast(mission_label as varchar) as mission_label,
    try_cast(plf_ceiling_eur as double) as plafond_eur,
    cast(source as varchar) as source
from src
