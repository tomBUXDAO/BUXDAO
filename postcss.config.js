export default {
  plugins: {
    'postcss-preset-env': {
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': false,
      },
    },
    tailwindcss: {},
    autoprefixer: {
      grid: 'autoplace',
      flexbox: true,
      overrideBrowserslist: ['last 2 versions', '> 1%', 'not dead']
    }
  }
}
