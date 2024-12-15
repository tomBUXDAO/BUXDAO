export default {
  plugins: {
    'postcss-preset-env': {
      features: {
        'nesting-rules': true,
      },
      autoprefixer: {
        flexbox: true,
        grid: true
      },
      browsers: ['> 1%', 'last 2 versions', 'Firefox ESR', 'not dead']
    },
    tailwindcss: {},
  },
}
