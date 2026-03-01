# constraints.py — Central configuration for CB-MOPA
# Import this everywhere. Never hardcode limits inline.

PHARMA_LIMITS = {
    "Friability": {"max": 1.0},
    "Dissolution_Rate": {"min": 80.0},
    "Content_Uniformity": {"min": 95.0, "max": 105.0},
    "Hardness": {"min": 60.0},
    "Disintegration_Time": {"max": 15.0},
    "Tablet_Weight": {"min": 197.0, "max": 215.0},
}

CARBON_CONFIG = {
    "grid_emission_factor": 0.72,  # kg CO2 per kWh
    "unit": "kg_CO2_per_kWh",
    "target_reduction_pct": 10,
    "regulatory_limit_kg": 50.0,  # max CO2e per batch
}

GOLDEN_CLUSTER_NAMES = {
    0: "Max Quality Golden",
    1: "Deep Decarbonization Golden",
    2: "Balanced Operational Golden",
}

PHASE_ORDER = [
    "Preparation",
    "Granulation",
    "Drying",
    "Milling",
    "Blending",
    "Compression",
    "Coating",
    "Quality_Testing",
]

CPP_COLS = [
    "Granulation_Time",
    "Binder_Amount",
    "Drying_Temp",
    "Drying_Time",
    "Compression_Force",
    "Machine_Speed",
    "Lubricant_Conc",
    "Moisture_Content",
]

CQA_COLS = [
    "Hardness",
    "Friability",
    "Disintegration_Time",
    "Dissolution_Rate",
    "Content_Uniformity",
    "Tablet_Weight",
]

PHASE_SENSOR_MAP = {
    "Granulation": ["Temperature_C", "Power_Consumption_kW", "Motor_Speed_RPM"],
    "Drying": ["Temperature_C", "Power_Consumption_kW", "Humidity_Percent"],
    "Milling": ["Motor_Speed_RPM", "Power_Consumption_kW", "Vibration_mm_s"],
    "Compression": ["Compression_Force_kN", "Power_Consumption_kW", "Motor_Speed_RPM"],
    "Coating": ["Motor_Speed_RPM", "Flow_Rate_LPM", "Power_Consumption_kW"],
}


def validate_batch(outcomes_dict: dict) -> dict:
    """
    Check a batch outcome dict against PHARMA_LIMITS.
    Returns {"passed": bool, "violations": list of str}
    Can also be used as df.apply(lambda row: validate_batch(row.to_dict()), axis=1)
    but returns the bool value in that case for Reg_Pass column.
    """
    violations = []
    for col, limits in PHARMA_LIMITS.items():
        if col not in outcomes_dict:
            continue
        val = outcomes_dict[col]
        if "min" in limits and val < limits["min"]:
            violations.append(f"{col}={val:.2f} < min {limits['min']}")
        if "max" in limits and val > limits["max"]:
            violations.append(f"{col}={val:.2f} > max {limits['max']}")
    return {"passed": len(violations) == 0, "violations": violations}
