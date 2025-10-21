module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['Fira Code', 'ui-monospace', 'SFMono-Regular'],
      },
      colors: {
        'brand-cyan': '#22d3ee',
      },
      boxShadow: {
        glow: '0 18px 48px rgba(45, 212, 191, 0.25)',
      },
    },
  },
  plugins: [],
};
