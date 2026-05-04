import type { Preview } from '@storybook/svelte';

const preview: Preview = {
	parameters: {
		backgrounds: {
			default: 'dreamfield',
			values: [
				{ name: 'dreamfield', value: '#0a0a0f' },
				{ name: 'light', value: '#f0f0f5' }
			]
		}
	}
};

export default preview;
