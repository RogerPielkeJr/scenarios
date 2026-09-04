"""Maps EI Statistical Review country names to World Bank ISO3 codes.

Built by hand against the real World Bank country list (`GET
https://api.worldbank.org/v2/country?format=json&per_page=400`, checked
2026-08-04), not guessed -- every one of the 78 mapped entries has a
confirmed match in that list.

Two of the 80 countries in the EI sheet have NO entry here, deliberately:
- Taiwan: no World Bank GDP series exists for Taiwan at all (not a data
  gap on our end -- World Bank's country list simply doesn't include
  it).
- USSR: real CO2 data for 1965-1990 in the EI sheet, but a pre-1991
  historical entity with no modern GDP series to pair it with.
Both are dropped at the join step (build_decarb_data.py) for lack of a GDP
match, not silently mismapped to a present-day successor state.
"""

EI_NAME_TO_ISO3 = {
    'Algeria': 'DZA',
    'Argentina': 'ARG',
    'Australia': 'AUS',
    'Austria': 'AUT',
    'Azerbaijan': 'AZE',
    'Bangladesh': 'BGD',
    'Belarus': 'BLR',
    'Belgium': 'BEL',
    'Brazil': 'BRA',
    'Bulgaria': 'BGR',
    'Canada': 'CAN',
    'Chile': 'CHL',
    'China': 'CHN',
    'China Hong Kong SAR': 'HKG',
    'Colombia': 'COL',
    'Croatia': 'HRV',
    'Cyprus': 'CYP',
    'Czech Republic': 'CZE',
    'Denmark': 'DNK',
    'Ecuador': 'ECU',
    'Egypt': 'EGY',
    'Estonia': 'EST',
    'Finland': 'FIN',
    'France': 'FRA',
    'Germany': 'DEU',
    'Greece': 'GRC',
    'Hungary': 'HUN',
    'Iceland': 'ISL',
    'India': 'IND',
    'Indonesia': 'IDN',
    'Iran': 'IRN',
    'Iraq': 'IRQ',
    'Ireland': 'IRL',
    'Israel': 'ISR',
    'Italy': 'ITA',
    'Japan': 'JPN',
    'Kazakhstan': 'KAZ',
    'Kuwait': 'KWT',
    'Latvia': 'LVA',
    'Lithuania': 'LTU',
    'Luxembourg': 'LUX',
    'Malaysia': 'MYS',
    'Mexico': 'MEX',
    'Morocco': 'MAR',
    'Netherlands': 'NLD',
    'New Zealand': 'NZL',
    'North Macedonia': 'MKD',
    'Norway': 'NOR',
    'Oman': 'OMN',
    'Pakistan': 'PAK',
    'Peru': 'PER',
    'Philippines': 'PHL',
    'Poland': 'POL',
    'Portugal': 'PRT',
    'Qatar': 'QAT',
    'Romania': 'ROU',
    'Russian Federation': 'RUS',
    'Saudi Arabia': 'SAU',
    'Singapore': 'SGP',
    'Slovakia': 'SVK',
    'Slovenia': 'SVN',
    'South Africa': 'ZAF',
    'South Korea': 'KOR',
    'Spain': 'ESP',
    'Sri Lanka': 'LKA',
    'Sweden': 'SWE',
    'Switzerland': 'CHE',
    'Thailand': 'THA',
    'Trinidad & Tobago': 'TTO',
    'Türkiye': 'TUR',  # EI's 2026 edition renamed the row from 'Turkey' -- ISO3 unchanged
    'Turkmenistan': 'TKM',
    'US': 'USA',
    'Ukraine': 'UKR',
    'United Arab Emirates': 'ARE',
    'United Kingdom': 'GBR',
    'Uzbekistan': 'UZB',
    'Venezuela': 'VEN',
    'Vietnam': 'VNM',
}

NO_GDP_MATCH = {'Taiwan', 'USSR'}
