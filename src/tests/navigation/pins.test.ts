import { describe, it, expect, beforeEach } from 'vitest';
import {
	initDefaultPins, getPins, addPin, removePin,
	findNearestPin, getPinsByCategory, pinToWorldPosition,
	togglePinVisibility, toggleCategory, PIN_COLORS
} from '$lib/navigation/pins.js';

beforeEach(() => {
	initDefaultPins();
});

describe('Location Pins', () => {
	it('initializes with default pins', () => {
		const pins = getPins();
		expect(pins.length).toBeGreaterThanOrEqual(9);
		expect(pins.find(p => p.name === 'London')).toBeDefined();
		expect(pins.find(p => p.name === 'North Pole')).toBeDefined();
	});

	it('adds a custom pin', () => {
		const before = getPins().length;
		addPin({
			name: 'Custom Spot',
			category: 'custom',
			lat: 45,
			lon: 90,
			alt: 100,
			color: PIN_COLORS.custom,
			createdBy: 'user',
			visible: true,
		});
		expect(getPins().length).toBe(before + 1);
		expect(getPins().find(p => p.name === 'Custom Spot')).toBeDefined();
	});

	it('removes a pin', () => {
		const pins = getPins();
		const id = pins[0].id;
		removePin(id);
		expect(getPins().find(p => p.id === id)).toBeUndefined();
	});

	it('finds nearest pin', () => {
		const nearest = findNearestPin(51.5, -0.1); // Near London
		expect(nearest).not.toBeNull();
		expect(nearest!.name).toBe('London');
	});

	it('filters by category', () => {
		const cities = getPinsByCategory('city');
		expect(cities.length).toBeGreaterThanOrEqual(4);
		cities.forEach(p => expect(p.category).toBe('city'));
	});

	it('computes world position', () => {
		const pin = getPins()[0];
		const pos = pinToWorldPosition(pin);
		expect(pos).toHaveLength(3);
		expect(pos.every(v => isFinite(v))).toBe(true);
	});

	it('toggles pin visibility', () => {
		const pin = getPins()[0];
		expect(pin.visible).toBe(true);
		togglePinVisibility(pin.id);
		expect(getPins().find(p => p.id === pin.id)!.visible).toBe(false);
	});

	it('toggles category visibility', () => {
		toggleCategory('city', false);
		const cities = getPinsByCategory('city');
		cities.forEach(p => expect(p.visible).toBe(false));
	});
});
