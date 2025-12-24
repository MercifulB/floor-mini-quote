from __future__ import annotations

from typing import Any, Dict


def compute_quote(payload: Dict[str, Any]) -> Dict[str, Any]:
    takeoff = payload.get("takeoff") or {}

    # Your vision returns counts now
    windows_count = int(takeoff.get("windows", 0))
    doors_count = int(takeoff.get("doors", 0))

    material = payload.get("material", "aluminum")
    include_installation = bool(payload.get("include_installation", False))

    # Simple pricing rules (adjust later)
    base_prices = {
        "aluminum": {"window": 900, "door": 1100},
        "steel": {"window": 1300, "door": 1600},
    }

    if material not in base_prices:
        material = "aluminum"

    window_unit = base_prices[material]["window"]
    door_unit = base_prices[material]["door"]

    materials_subtotal = windows_count * window_unit + doors_count * door_unit

    install_fee = int(materials_subtotal * 0.18) if include_installation else 0
    subtotal = materials_subtotal + install_fee

    quote_low = int(subtotal * 0.92)
    quote_high = int(subtotal * 1.12)

    assumptions = [
        "Counts are based on symbol detection and should be verified against drawings.",
        f"Unit pricing uses a simplified {material} rate card.",
    ]
    if include_installation:
        assumptions.append("Installation is estimated as 18% of materials.")

    return {
        "counts": {"windows": windows_count, "doors": doors_count},
        "material": material,
        "include_installation": include_installation,
        "subtotal": materials_subtotal,
        "quote_low": quote_low,
        "quote_high": quote_high,
        "assumptions": assumptions,
    }
