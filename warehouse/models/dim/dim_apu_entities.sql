{{ config(materialized='view') }}

with rules as (
    select
        domain,
        key_type,
        match_type,
        nullif(match_value, '__all__') as match_value,
        apu_subsector,
        priority
    from (
        values
            ('admin', 'mission_code', 'exact', 'RB', 'ASSO', 100),
            ('admin', 'mission_code', 'exact', 'YD', 'ASSO', 95),
            ('admin', 'mission_code', 'exact', 'SE', 'ASSO', 90),
            ('admin', 'mission_code', 'exact', 'SA', 'ASSO', 85),
            ('admin', 'mission_code', 'exact', 'RC', 'APUL', 80),
            ('admin', 'mission_code', 'exact', 'VA', 'APUL', 75),
            ('admin', 'mission_code', 'exact', 'ZC', 'APUL', 70),
            ('admin', 'mission_code', 'exact', 'YK', 'APUL', 65),
            ('admin', 'mission_code', 'all', '__all__', 'APUC', 10),
            ('procurement', 'buyer_org_id', 'prefix', 'MIN-', 'APUC', 90),
            ('procurement', 'buyer_org_id', 'prefix', 'CT-', 'APUL', 80),
            ('procurement', 'buyer_org_id', 'prefix', 'REG-', 'APUL', 75),
            ('procurement', 'buyer_org_id', 'prefix', 'CNAF-', 'ASSO', 70),
            ('procurement', 'buyer_org_id', 'all', '__all__', 'APUC', 10)
    ) as r(domain, key_type, match_type, match_value, apu_subsector, priority)
),
admin_keys as (
    select distinct
        'admin'::varchar as domain,
        'mission_code'::varchar as key_type,
        mission_code as key_value,
        mission_label as key_label
    from {{ ref('stg_state_budget_lines') }}
    where mission_code is not null
),
all_keys as (
    select * from admin_keys
),
match_candidates as (
    select
        k.domain,
        k.key_type,
        k.key_value,
        k.key_label,
        r.apu_subsector,
        r.priority,
        row_number() over (
            partition by k.domain, k.key_type, k.key_value
            order by
                r.priority desc,
                case r.match_type
                    when 'exact' then 0
                    when 'prefix' then 1
                    when 'all' then 2
                    else 3
                end,
                coalesce(length(r.match_value), 0) desc
        ) as rn
    from all_keys k
    join rules r
        on r.domain = k.domain
       and r.key_type = k.key_type
    where
        (r.match_type = 'exact' and r.match_value = k.key_value)
        or (r.match_type = 'prefix' and r.match_value is not null and r.match_value <> ''
            and substr(k.key_value, 1, length(r.match_value)) = r.match_value)
        or (r.match_type = 'all')
),
classified as (
    select
        k.domain,
        k.key_type,
        k.key_value,
        k.key_label,
        coalesce(mc.apu_subsector, 'APUC') as apu_subsector
    from all_keys k
    left join (
        select domain, key_type, key_value, apu_subsector
        from match_candidates
        where rn = 1
    ) mc
        on mc.domain = k.domain
       and mc.key_type = k.key_type
       and mc.key_value = k.key_value
)
select * from classified
