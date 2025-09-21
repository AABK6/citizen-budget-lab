{{ config(materialized='view') }}

select *
from (
    values
        ('APUC'::varchar, 'Administration publique centrale'::varchar, 'État, ministères et opérateurs centraux'::varchar),
        ('APUL'::varchar, 'Administrations publiques locales'::varchar, 'Collectivités territoriales et établissements publics locaux'::varchar),
        ('ASSO'::varchar, 'Administrations de sécurité sociale'::varchar, 'Régimes et caisses de sécurité sociale'::varchar)
) as t(apu_subsector, label, description)
