-- Totals in COFOG aggregation must match mission totals for both AE and CP.

with mission as (
    select year, sum(cp_eur) as cp_total, sum(ae_eur) as ae_total
    from {{ ref('fct_admin_by_mission') }}
    group by year
),
cofog as (
    select year, sum(cp_eur) as cp_total, sum(ae_eur) as ae_total
    from {{ ref('fct_admin_by_cofog') }}
    group by year
)
select
    m.year,
    m.cp_total as mission_cp,
    c.cp_total as cofog_cp,
    m.ae_total as mission_ae,
    c.ae_total as cofog_ae
from mission m
join cofog c using (year)
where (abs(m.cp_total - c.cp_total) > 1e-6 and m.cp_total is not null)
   or (abs(m.ae_total - c.ae_total) > 1e-6 and m.ae_total is not null)
