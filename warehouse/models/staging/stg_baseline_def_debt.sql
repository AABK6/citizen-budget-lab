{{ config(materialized='view') }}

with src as (
  select * from read_csv_auto('{{ var('baseline_deficit_debt_csv') }}', header=true)
)
select
  try_cast(year as integer) as year,
  try_cast(deficit_eur as double) as deficit_eur,
  try_cast(debt_eur as double) as debt_eur,
  now() as updated_at
from src
