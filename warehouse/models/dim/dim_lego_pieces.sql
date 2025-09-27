{{ config(materialized='view') }}

select
    piece_id,
    piece_type,
    piece_label,
    piece_description,
    mission_mapping
from {{ ref('stg_lego_pieces') }}
