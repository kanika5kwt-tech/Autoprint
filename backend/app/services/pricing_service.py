from sqlalchemy.orm import Session

# Default pricing (baad mein database se configurable banayenge)
PRICING = {
    "bw_single": 1.00,
    "bw_double": 0.80,
    "colour_single": 5.00,
    "colour_double": 4.00,
    "a3_surcharge": 2.00,
    "stapling_cost": 2.00
}

def calculate_cost(
    pages_to_print: int,
    copies: int,
    colour_mode: str,
    sides: str,
    paper_size: str,
    stapling: bool
) -> dict:

    # Cost per page decide karo
    if colour_mode == "bw":
        if sides == "single":
            cost_per_page = PRICING["bw_single"]
        else:
            cost_per_page = PRICING["bw_double"]
    else:
        if sides == "single":
            cost_per_page = PRICING["colour_single"]
        else:
            cost_per_page = PRICING["colour_double"]

    # Total calculate karo
    base_cost = pages_to_print * copies * cost_per_page

    # A3 surcharge
    a3_cost = 0
    if paper_size == "A3":
        a3_cost = pages_to_print * copies * PRICING["a3_surcharge"]

    # Stapling cost
    staple_cost = PRICING["stapling_cost"] if stapling else 0

    total = base_cost + a3_cost + staple_cost

    return {
        "cost_per_page": cost_per_page,
        "base_cost": round(base_cost, 2),
        "a3_surcharge": round(a3_cost, 2),
        "stapling_cost": round(staple_cost, 2),
        "total_amount": round(total, 2),
        "breakdown": f"{pages_to_print} pages x {copies} copies x Rs.{cost_per_page} = Rs.{round(base_cost, 2)}"
    }