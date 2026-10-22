/** Separate validation builds from a running development server. */
export default { distDir: process.env.DAYBREAK_BUILD_DIR || ".next" };
