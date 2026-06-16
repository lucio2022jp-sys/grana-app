/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta colorida estilo Duolingo/Cora
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        secondary: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        accent: {
          yellow: '#fbbf24',
          green: '#10b981',
          orange: '#f97316',
          pink: '#ec4899',
          red: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #fef3c7 0%, #fbcfe8 50%, #ddd6fe 100%)',
        'gradient-money': 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        'gradient-warning': 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)',
        'gradient-cool': 'linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%)',
        'gradient-pink': 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
        'glow-pink': '0 8px 32px -8px rgba(236, 72, 153, 0.5)',
        'glow-cool': '0 8px 32px -8px rgba(14, 165, 233, 0.5)',
        'glow-money': '0 8px 32px -8px rgba(16, 185, 129, 0.5)',
        'glow-yellow': '0 8px 32px -8px rgba(251, 191, 36, 0.5)',
      },
    },
  },
  plugins: [],
};
