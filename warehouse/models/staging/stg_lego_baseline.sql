{{ config(materialized='view') }}

-- This model reads and unnests the lego_baseline_*.json files.

select
    t.year,
    t.scope,
    piece ->> 'id' as piece_id,
    piece ->> 'amount_eur' as amount_eur,
    piece ->> 'share' as share,
    -- Add filename for better traceability
    t.filename
from
    read_json_auto('{{ var('lego_baseline_glob') }}', filename=true) as t,
    unnest(t.pieces) as piece_tbl(piece)
