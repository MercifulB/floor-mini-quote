def compute_quote(payload: dict) -> dict:
    takeoff = payload.get("takeoff", {})
    windows = takeoff.get("windows", [])
    doors = takeoff.get("doors", [])

    material = payload.get("material", "aluminum")
    include_install = bool(payload.get("include_installation", False))

    base_prices = {
        "window": 650.0,
        "door": 900.0
    }
    material_multiplier = {
        "aluminum": 1.15,
        "steel": 1.35
    }

    mult = material_multiplier.get(material, 1.15)

    window_cost = len(windows) * base_prices["window"] * mult
    door_cost = len(doors) * base_prices["door"] * mult
    subtotal = window_cost + door_cost

    low_conf = [x for x in windows + doors if x.get("confidence", 0) < 0.70]
    contingency_rate = 0.08 if len(low_conf) == 0 else 0.15

    install_rate = 0.20 if include_install else 0.0

    low = subtotal * (1 + install_rate)
    high = subtotal * (1 + install_rate + contingency_rate)

    assumptions = []
    assumptions.append(f"Material pricing multiplier: {material} at {mult}.")
    assumptions.append("Base prices are simplified demo values.")
    if include_install:
        assumptions.append("Installation add on applied.")
    if len(low_conf) > 0:
        assumptions.append("Higher contingency due to low confidence detections.")

    return {
        "counts": {"windows": len(windows), "doors": len(doors)},
        "material": material,
        "include_installation": include_install,
        "subtotal": round(subtotal, 2),
        "quote_low": round(low, 2),
        "quote_high": round(high, 2),
        "assumptions": assumptions
    }
