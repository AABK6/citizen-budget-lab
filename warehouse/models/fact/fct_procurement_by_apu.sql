{{ config(materialized='view') }}

with rules as (
    select *
    from (
        values
            ('prefix', 'MIN-', 'APUC', 90),
            ('prefix', 'CT-', 'APUL', 80),
            ('prefix', 'REG-', 'APUL', 75),
            ('prefix', 'CNAF-', 'ASSO', 70),
            ('all', '__all__', 'APUC', 10)
    ) as r(match_type, match_value, apu_subsector, priority)
),
base as (
    select
        year,
        buyer_org_id,
        coalesce(amount_eur, 0) as amount_eur,
        coalesce(lot_count, 0) as lot_count
    from {{ ref('stg_procurement_contracts') }}
    where buyer_org_id is not null
),
classified as (
    select
        b.year,
        coalesce(m.apu_subsector, 'APUC') as apu_subsector,
        b.amount_eur,
        b.lot_count
    from base b
    left join (
        select
            buyer_org_id,
            apu_subsector
        from (
            select
                b.buyer_org_id,
                r.apu_subsector,
                r.priority,
                row_number() over (
                    partition by b.buyer_org_id
                    order by r.priority desc,
                        case r.match_type when 'prefix' then 0 else 1 end,
                        length(r.match_value) desc
                ) as rn
            from base b
            join rules r
                on (r.match_type = 'prefix' and substr(b.buyer_org_id, 1, length(r.match_value)) = r.match_value)
                or (r.match_type = 'all')
        ) t
        where rn = 1
    ) m
        on m.buyer_org_id = b.buyer_org_id
),
aggregated as (
    select
        year,
        apu_subsector,
        sum(amount_eur) as amount_eur,
        count(*) as contract_count,
        sum(lot_count) as lot_count
    from classified
    group by 1, 2
)
select * from aggregated
