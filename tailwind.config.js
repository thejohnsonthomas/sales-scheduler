/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'card-lively',
    'badge-success',
    'badge-warning',
    'badge',
    { pattern: /border-l-4/ },
    { pattern: /border-(l|r|t|b)-\[var\(--[a-z-]+\)\]/ },
    { pattern: /bg-\[var\(--[a-z-]+\)\]/ },
    { pattern: /shadow-\[var\(--accent\)\]\/\d+/ },
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        border: 'var(--border)',
      },
    },
  },
  plugins: [],
};
