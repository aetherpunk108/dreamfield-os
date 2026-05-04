/** WGS84 ellipsoid constants */
export const WGS84 = {
	/** Semi-major axis (equatorial radius) in meters */
	a: 6_378_137.0,
	/** Semi-minor axis (polar radius) in meters */
	b: 6_356_752.314245,
	/** Flattening */
	f: 1 / 298.257223563,
	/** First eccentricity squared */
	e2: 0.00669437999014,
} as const;

/** Celestial body radii in meters */
export const BODY_RADIUS = {
	earth: 6_371_000,
	moon: 1_737_400,
	sun: 696_340_000,
} as const;

/** Mean orbital distances in meters */
export const ORBITAL_DISTANCE = {
	earthToMoon: 384_400_000,
	earthToSun: 149_597_870_700,
} as const;

/** Orbital periods in seconds */
export const ORBITAL_PERIOD = {
	/** Sidereal month */
	moonAroundEarth: 27.321661 * 86400,
	/** Sidereal year */
	earthAroundSun: 365.256363004 * 86400,
	/** Earth rotation (sidereal day) */
	earthRotation: 86164.0905,
} as const;

/** Axial tilts in radians */
export const AXIAL_TILT = {
	earth: 23.4393 * (Math.PI / 180),
	moon: 6.687 * (Math.PI / 180),
} as const;

/** Speed of light in m/s */
export const C = 299_792_458;

/** Gravitational parameter (GM) in m³/s² */
export const GM = {
	sun: 1.32712440018e20,
	earth: 3.986004418e14,
	moon: 4.9048695e12,
} as const;

/** Scale factor for visualization (1 unit = this many meters) */
export const VIS_SCALE = 1e-7;
