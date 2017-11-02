module.exports = {
  extends: 'standard',
  ecmaFeatures: {
    globalReturn: true,
    jsx: true,
    modules: true
  },
  env: {
    browser: true,
    es6: true,
    node: true
  },
  plugins: ['standard', 'promise'],
  globals: {},
  rules: {
    'space-before-function-paren': 'off'
  }
}
