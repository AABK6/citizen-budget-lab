{{ config(materialized='view') }}

with baseline as (
    select
        year,
        piece_id,
        amount_eur
    from {{ ref('fct_lego_baseline') }}
    where amount_eur is not null
),
mission_weights_raw as (
    select
        p.piece_id,
        upper(coalesce(mission.value ->> 'code', '')) as mission_code,
        try_cast(mission.value ->> 'weight' as double) as weight
    from {{ ref('dim_lego_pieces') }} p
         , json_each(coalesce(p.mission_mapping, cast('[]' as json))) as mission
),
mission_weights_filtered as (
    select
        piece_id,
        mission_code,
        coalesce(weight, 0.0) as weight
    from mission_weights_raw
    where mission_code <> ''
),
mission_weights_norm as (
    select
        piece_id,
        mission_code,
        weight,
        sum(weight) over (partition by piece_id) as total_weight
    from mission_weights_filtered
    where weight > 0
),
mission_weights as (
    select
        piece_id,
        mission_code,
        weight / total_weight as weight
    from mission_weights_norm
    where total_weight > 0
),
baseline_pieces as (
    select distinct piece_id from baseline
),
missing_pieces as (
    select bp.piece_id
    from baseline_pieces bp
    left join (select distinct piece_id from mission_weights) mw on bp.piece_id = mw.piece_id
    where mw.piece_id is null
),
piece_weights as (
    select * from mission_weights
    union all
    select piece_id, 'M_UNKNOWN' as mission_code, 1.0 as weight
    from missing_pieces
),
allocated as (
    select
        b.year,
        pw.mission_code,
        sum(b.amount_eur * pw.weight) as amount_eur
    from baseline b
    join piece_weights pw on b.piece_id = pw.piece_id
    group by 1, 2
),
with_share as (
    select
        year,
        mission_code,
        amount_eur,
        case when sum(amount_eur) over (partition by year) > 0
             then amount_eur / sum(amount_eur) over (partition by year)
             else 0.0 end as share
    from allocated
)
select * from with_share
order by year, mission_code
;
