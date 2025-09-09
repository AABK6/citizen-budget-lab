{{ config(materialized='table') }}

select
    cast(year as integer) as year,
    cast(scope as varchar) as scope,
    cast(piece_id as varchar) as piece_id,
    try_cast(amount_eur as double) as amount_eur,
    try_cast(share as double) as share,
    filename as source_file
from {{ ref('stg_lego_baseline') }}
where year is not null
