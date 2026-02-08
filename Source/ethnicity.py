"""
Ethnicity-Adjusted Carrier Frequency Engine for Mergenix.

Provides population-specific carrier frequency adjustments based on
gnomAD v4.1 data. Supports Bayesian posterior calculations for
carrier risk given genotype and population background.

Supported populations:
    - African/African American
    - East Asian
    - South Asian
    - European (Non-Finnish)
    - Finnish
    - Latino/Admixed American
    - Ashkenazi Jewish
    - Middle Eastern
    - Global
"""

import json
import math
import os

POPULATIONS: list[str] = [
    "African/African American",
    "East Asian",
    "South Asian",
    "European (Non-Finnish)",
    "Finnish",
    "Latino/Admixed American",
    "Ashkenazi Jewish",
    "Middle Eastern",
    "Global",
]

# Default path for the ethnicity frequency data file
_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DEFAULT_ETHNICITY_DATA_PATH = os.path.join(_DATA_DIR, "ethnicity_frequencies.json")


def load_ethnicity_data(path: str | None = None) -> dict:
    """
    Load ethnicity frequency data from JSON file.

    Args:
        path: Path to ethnicity_frequencies.json. Uses default if None.

    Returns:
        Parsed JSON dict with "metadata" and "frequencies" keys.
    """
    if path is None:
        path = DEFAULT_ETHNICITY_DATA_PATH
    with open(path) as f:
        return json.load(f)


def get_population_frequency(
    rsid: str,
    population: str,
    ethnicity_data: dict,
) -> float | None:
    """
    Look up the population-specific carrier frequency for a given rsID.

    Falls back to the "Global" frequency if the requested population
    is not present for that variant.

    Args:
        rsid: SNP identifier (e.g. "rs334").
        population: One of the POPULATIONS values.
        ethnicity_data: Loaded ethnicity frequency data dict.

    Returns:
        Carrier frequency as a float, or None if the rsID is not in the data.
    """
    frequencies = ethnicity_data.get("frequencies", {})
    variant = frequencies.get(rsid)
    if variant is None:
        return None

    freq = variant.get(population)
    if freq is not None:
        return float(freq)

    # Fall back to global
    global_freq = variant.get("Global")
    if global_freq is not None:
        return float(global_freq)

    return None


def adjust_carrier_risk(
    base_risk: float,
    population_frequency: float,
    global_frequency: float,
) -> dict:
    """
    Adjust a base carrier risk using the ratio of population to global frequency.

    The adjustment factor is ``population_frequency / global_frequency``.
    The adjusted risk is clamped to [0.0, 1.0].

    Args:
        base_risk: Original carrier risk (0.0-1.0 scale).
        population_frequency: Carrier frequency in the target population.
        global_frequency: Global carrier frequency.

    Returns:
        Dict with keys:
            - "base_risk": the original risk
            - "adjusted_risk": risk after population adjustment
            - "adjustment_factor": ratio used for the adjustment
            - "population_frequency": the population freq used
            - "global_frequency": the global freq used
    """
    if global_frequency <= 0:
        return {
            "base_risk": base_risk,
            "adjusted_risk": base_risk,
            "adjustment_factor": 1.0,
            "population_frequency": population_frequency,
            "global_frequency": global_frequency,
        }

    adjustment_factor = population_frequency / global_frequency
    adjusted_risk = min(max(base_risk * adjustment_factor, 0.0), 1.0)

    return {
        "base_risk": base_risk,
        "adjusted_risk": adjusted_risk,
        "adjustment_factor": adjustment_factor,
        "population_frequency": population_frequency,
        "global_frequency": global_frequency,
    }


def calculate_bayesian_posterior(
    prior_frequency: float,
    genotype_data: dict,
    population: str,
) -> float:
    """
    Compute Bayesian posterior probability of being a carrier given
    genotype observation and population background.

    P(carrier | genotype, population) =
        P(genotype | carrier) * P(carrier) /
        [P(genotype | carrier) * P(carrier) + P(genotype | non-carrier) * P(non-carrier)]

    Genotype likelihoods:
        - "carrier" genotype  -> P(obs | carrier) = 0.99, P(obs | non-carrier) = prior * 0.01
        - "normal"  genotype  -> P(obs | carrier) = 0.01, P(obs | non-carrier) = 0.99
        - "affected" genotype -> P(obs | carrier) = 0.50, P(obs | non-carrier) = 0.001
        - otherwise           -> uniform (returns prior unchanged)

    Args:
        prior_frequency: Population carrier frequency (0-1).
        genotype_data: Dict with at least a "status" key
                       ("carrier", "normal", "affected", or "unknown").
        population: Population label (used for documentation; the prior
                    already encodes population information).

    Returns:
        Posterior probability of being a carrier (0.0-1.0).
    """
    if prior_frequency is None or prior_frequency < 0:
        return 0.0
    if prior_frequency > 1:
        prior_frequency = 1.0

    status = genotype_data.get("status", "unknown") if genotype_data else "unknown"

    # Likelihood P(genotype | carrier) and P(genotype | non-carrier)
    if status == "carrier":
        p_genotype_given_carrier = 0.99
        p_genotype_given_noncarrier = max(prior_frequency * 0.01, 1e-10)
    elif status == "normal":
        p_genotype_given_carrier = 0.01
        p_genotype_given_noncarrier = 0.99
    elif status == "affected":
        p_genotype_given_carrier = 0.50
        p_genotype_given_noncarrier = 0.001
    else:
        # Unknown — no evidence, posterior equals prior
        return prior_frequency

    prior_carrier = prior_frequency
    prior_noncarrier = 1.0 - prior_frequency

    numerator = p_genotype_given_carrier * prior_carrier
    denominator = numerator + p_genotype_given_noncarrier * prior_noncarrier

    if denominator <= 0:
        return 0.0

    posterior = numerator / denominator
    return min(max(posterior, 0.0), 1.0)


def get_ethnicity_summary(
    rsid: str,
    all_populations: list[str] | None,
    ethnicity_data: dict,
) -> dict:
    """
    Build a frequency comparison across all populations for a given variant.

    Args:
        rsid: SNP identifier.
        all_populations: List of population names. Defaults to POPULATIONS.
        ethnicity_data: Loaded ethnicity frequency data dict.

    Returns:
        Dict with keys:
            - "rsid": the queried rsID
            - "gene": gene symbol (if present)
            - "condition": condition name (if present)
            - "frequencies": dict mapping population -> frequency (or None)
            - "global": global frequency (or None)
            - "found": bool indicating if the rsID was in the data
    """
    if all_populations is None:
        all_populations = POPULATIONS

    frequencies_db = ethnicity_data.get("frequencies", {})
    variant = frequencies_db.get(rsid)

    if variant is None:
        return {
            "rsid": rsid,
            "gene": None,
            "condition": None,
            "frequencies": {pop: None for pop in all_populations},
            "global": None,
            "found": False,
        }

    pop_freqs = {}
    for pop in all_populations:
        pop_freqs[pop] = variant.get(pop)

    return {
        "rsid": rsid,
        "gene": variant.get("gene"),
        "condition": variant.get("condition"),
        "frequencies": pop_freqs,
        "global": variant.get("Global"),
        "found": True,
    }


def format_frequency_comparison(
    population_freq: float,
    global_freq: float,
) -> str:
    """
    Format a human-readable comparison of population vs global frequency.

    Examples:
        - "2.3x higher than global average"
        - "0.4x lower than global average"
        - "Equal to global average"

    Args:
        population_freq: Carrier frequency in target population.
        global_freq: Global carrier frequency.

    Returns:
        Formatted comparison string.
    """
    if global_freq is None or global_freq <= 0:
        if population_freq and population_freq > 0:
            return "No global data for comparison"
        return "No data available"

    if population_freq is None or population_freq < 0:
        return "No population data available"

    ratio = population_freq / global_freq

    if math.isclose(ratio, 1.0, rel_tol=0.05):
        return "Equal to global average"
    elif ratio > 1.0:
        return f"{ratio:.1f}x higher than global average"
    else:
        return f"{ratio:.1f}x lower than global average"
