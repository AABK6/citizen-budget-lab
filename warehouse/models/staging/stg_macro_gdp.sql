{{ config(materialized='view') }}

with src as (
  select * from read_csv_auto('{{ var('gdp_series_csv') }}', header=true)
)
select
  try_cast(year as integer) as year,
  try_cast(gdp_eur as double) as gdp_eur,
  now() as updated_at
from src
