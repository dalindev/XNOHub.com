import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    // React Compiler rules (new in eslint-config-next 16) flag v1 code that
    // Phase 1 rewrites (feed hook, arcs, rockets). Back to 'error' after that.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn'
    }
  },
  { ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts', 'video/out/**'] }
];

export default config;
