from __future__ import annotations

"""
Contract test: runtime GraphQL schema must include all types/fields defined in
the canonical SDL (`graphql/schema.sdl.graphql`).

This allows runtime to add extra fields (e.g., scenario), but prevents drift
where the SDL fields disappear from the runtime.
"""

from typing import Dict, Set

from graphql import build_schema, GraphQLSchema, GraphQLObjectType, GraphQLNamedType
from strawberry.printer import print_schema

from services.api import schema as runtime_schema


def _load_canonical_sdl() -> str:
    with open("graphql/schema.sdl.graphql", "r", encoding="utf-8") as f:
        return f.read()


def _types(schema: GraphQLSchema) -> Dict[str, GraphQLNamedType]:
    # Exclude introspection types
    return {k: v for k, v in schema.type_map.items() if not k.startswith("__")}


def test_runtime_includes_all_sdl_types_and_fields():
    # Build reference schema from SDL
    sdl_text = _load_canonical_sdl()
    ref = build_schema(sdl_text)

    # Obtain runtime schema from Strawberry
    runtime_sdl = print_schema(runtime_schema.schema)
    run = build_schema(runtime_sdl)

    ref_types = _types(ref)
    run_types = _types(run)

    # Allow some SDL types/fields that are planned but not yet implemented at runtime
    ALLOWED_MISSING_TYPES: Set[str] = {"DecileImpact", "Distribution"}
    ALLOWED_MISSING_FIELDS: Dict[str, Set[str]] = {
        # SDL fields not yet present in runtime payload
        "RunScenarioPayload": {"distribution", "distanceScore", "shareSummary"},
    }

    # Types in SDL must exist in runtime (allow Type suffix in runtime names)
    for tname, tref in ref_types.items():
        runtime_name = tname if tname in run_types else (tname + "Type" if (tname + "Type") in run_types else None)
        if runtime_name is None:
            assert tname in ALLOWED_MISSING_TYPES, f"Missing type in runtime: {tname}"
            continue
        trun = run_types[runtime_name]
        # For object types, fields in SDL must exist in runtime
        if isinstance(tref, GraphQLObjectType) and isinstance(trun, GraphQLObjectType):
            ref_fields = set(tref.fields.keys())
            run_fields = set(trun.fields.keys())
            allowed_missing = ALLOWED_MISSING_FIELDS.get(tname, set())
            missing = (ref_fields - run_fields) - allowed_missing
            assert not missing, f"Type {tname} is missing fields in runtime: {sorted(missing)}"
