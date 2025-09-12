{{ config(materialized='view') }}

select year, gdp_eur, updated_at
from {{ ref('stg_macro_gdp') }}
