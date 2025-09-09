{{ config(materialized='view') }}

-- This model reads and unnests the lego_pieces.json file.

select
    piece ->> 'id' as piece_id,
    piece ->> 'type' as piece_type,
    piece ->> 'label' as piece_label,
    piece ->> 'description' as piece_description
from
    read_json_auto('{{ var("lego_pieces_json") }}') as t,
    unnest(t.pieces) as piece_tbl(piece)
