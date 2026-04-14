# Implement handling of metamagic feats
1. Need to handle calculations for intensified, empowered, and maximised in the damage calculator

# Improve spell display
1. Indicate if spell resistance applies in spell describe
2. Display save information for selected spell
3. Expose 'descriptortext' from spell definition in the portfolio and use it as the default for damage type for a spell's damage calculations
4. Display bonus to spell penetration for selected spell
5. Display bonus to concentration check, and DC to cast selected spell defensively
6. Indicate spell level on the spell selector

# Improvements to options handling
1. Deactivate and hide an Option if a character doesn't have the requisite feat or class feature
    - Similarly to how we can match an option to a buffId to determine if it should be on, we want to optionally match an option to the choices made for a character such as feats or magus arcana
    - Things a character receives automatically based on Magus level may not be explicitly mentioned in the portfolio, so we also want to be able to set a minimum magus level for an option (defaulting to 1)