{{ config(materialized='view') }}

select
  contract_id,
  buyer_org_id,
  supplier_siren,
  supplier_name,
  signed_date,
  amount_eur,
  cpv_code,
  procedure_type,
  lot_count,
  location_code,
  year
from {{ ref('stg_procurement_contracts') }}
