import adapter from '@sveltejs/adapter-static';

// Set BASE_PATH (e.g. `/showcase`) to serve the app from a sub-path. The output mirrors
// that path so a static host can map the route straight onto the build directory.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: `build${base}`,
      assets: `build${base}`,
      fallback: 'index.html'
    }),
    paths: { base }
  }
};

export default config;
