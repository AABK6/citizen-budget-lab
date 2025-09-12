{{ config(materialized='view') }}

select year, deficit_eur, debt_eur, updated_at
from {{ ref('stg_baseline_def_debt') }}
