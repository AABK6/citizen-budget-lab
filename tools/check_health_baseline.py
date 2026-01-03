from services.api import data_loader as dl

def check_health_baseline():
    """Check the baseline amount for M_HEALTH in 2026."""
    masses = dl.builder_mass_allocation(2026)
    health_mass = next((m for m in masses if m.get("massId") == "M_HEALTH"), None)
    
    if health_mass:
        print(f"Baseline M_HEALTH (2026): {health_mass['amountEur'] / 1e9:.1f} Md€")
    else:
        print("M_HEALTH not found in baseline")

if __name__ == "__main__":
    check_health_baseline()
