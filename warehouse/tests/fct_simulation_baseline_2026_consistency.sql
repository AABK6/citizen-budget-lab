-- Ensure the baseline totals remain internally consistent.

with agg as (
    select
        sum(cp_2025_eur) as cp_total,
        sum(plf_2026_ceiling_eur) as plf_total,
        sum(ceiling_delta_eur) as delta_total,
        sum(revenue_adjustment_eur) as revenue_adjust_total,
        max(total_revenue_change_eur) as total_revenue_change
    from {{ ref('fct_simulation_baseline_2026') }}
),
checks as (
    select
        abs((cp_total + delta_total) - plf_total) as budget_diff,
        abs(revenue_adjust_total - total_revenue_change) as revenue_diff
    from agg
)
select *
from checks
where budget_diff > 1e-4
   or revenue_diff > 1e-4
