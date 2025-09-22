{{ config(materialized='table') }}

with base_2025 as (
    select
        mission_code,
        any_value(mission_label) as mission_label,
        sum(cp_eur) as cp_2025_eur
    from {{ ref('fct_admin_by_mission') }}
    where year = 2025
    group by mission_code
),
plf_2026 as (
    select
        mission_code,
        mission_label,
        plafond_eur as plf_2026_ceiling_eur
    from {{ ref('stg_plf_2026_plafonds') }}
),
joined as (
    select
        coalesce(p.mission_code, b.mission_code) as mission_code,
        coalesce(p.mission_label, b.mission_label) as mission_label,
        coalesce(b.cp_2025_eur, 0.0) as cp_2025_eur,
        coalesce(p.plf_2026_ceiling_eur, 0.0) as plf_2026_ceiling_eur
    from base_2025 b
    full outer join plf_2026 p on p.mission_code = b.mission_code
),
delta as (
    select
        2026 as year,
        mission_code,
        mission_label,
        cp_2025_eur,
        plf_2026_ceiling_eur,
        plf_2026_ceiling_eur - cp_2025_eur as ceiling_delta_eur,
        case when cp_2025_eur = 0 then null else (plf_2026_ceiling_eur - cp_2025_eur) / cp_2025_eur end as ceiling_delta_pct
    from joined
),
macro_assumptions as (
    select
        year,
        gdp_growth_pct,
        inflation_pct,
        unemployment_rate_pct,
        1.0 + (gdp_growth_pct / 100.0) * 0.6 + (inflation_pct / 100.0) * 0.4 as revenue_growth_multiplier
    from {{ ref('macro_forecasts_2026') }}
),
revenue_baseline as (
    select
        sum(case when p.piece_type = 'revenue' then b.amount_eur else 0 end) as revenue_eur
    from {{ ref('fct_lego_baseline') }} b
    join {{ ref('dim_lego_pieces') }} p on b.piece_id = p.piece_id
    where b.year = 2026
),
macro_totals as (
    select
        ma.revenue_growth_multiplier,
        ma.gdp_growth_pct,
        ma.inflation_pct,
        ma.unemployment_rate_pct,
        rb.revenue_eur,
        (ma.revenue_growth_multiplier - 1.0) * coalesce(rb.revenue_eur, 0.0) as total_revenue_change_eur
    from macro_assumptions ma
    cross join revenue_baseline rb
),
totals as (
    select sum(cp_2025_eur) as total_cp_2025_eur from delta
),
final as (
    select
        d.year,
        d.mission_code,
        d.mission_label,
        d.cp_2025_eur,
        d.plf_2026_ceiling_eur,
        d.ceiling_delta_eur,
        d.ceiling_delta_pct,
        mt.total_revenue_change_eur,
        mt.revenue_growth_multiplier,
        mt.gdp_growth_pct,
        mt.inflation_pct,
        mt.unemployment_rate_pct,
        case
            when t.total_cp_2025_eur > 0
                then coalesce(mt.total_revenue_change_eur, 0.0) * (d.cp_2025_eur / t.total_cp_2025_eur)
            else 0.0
        end as revenue_adjustment_eur
    from delta d
    left join macro_totals mt on true
    cross join totals t
)
select
    year,
    mission_code,
    mission_label,
    cp_2025_eur,
    plf_2026_ceiling_eur,
    ceiling_delta_eur,
    ceiling_delta_pct,
    revenue_adjustment_eur,
    coalesce(total_revenue_change_eur, 0.0) as total_revenue_change_eur,
    coalesce(revenue_growth_multiplier, 1.0) as revenue_growth_multiplier,
    gdp_growth_pct,
    inflation_pct,
    unemployment_rate_pct,
    revenue_adjustment_eur - ceiling_delta_eur as net_fiscal_space_eur
from final
order by mission_code
