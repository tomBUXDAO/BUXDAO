export default {
  plugins: {
    'postcss-preset-env': {
      features: {
        'nesting-rules': true,
      },
    },
    tailwindcss: {},
    autoprefixer: {
      flexbox: true,
      grid: true
    },
  },
}
