import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  API_BASE_URL: {
    schema: (value) => value ?? 'http://127.0.0.1:8787',
  },
});
