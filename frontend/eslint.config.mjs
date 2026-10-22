import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['.next/**','.next-check/**','public/sw.js','next-env.d.ts']},...tseslint.configs.recommended);
