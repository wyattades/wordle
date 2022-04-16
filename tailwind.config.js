module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,md,mdx}',
    './components/**/*.{js,ts,jsx,tsx,md,mdx}',
  ],
  theme: {
    fontFamily: {
      mono: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    },
    extend: {
      typography: {
        DEFAULT: {
          css: {
            img: {
              margin: 0,
            },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
