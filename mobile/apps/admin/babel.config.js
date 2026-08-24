const path = require('path');
const monorepoRoot = path.resolve(__dirname, '../..');

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [require.resolve(path.join(monorepoRoot, 'node_modules/@babel/plugin-transform-optional-chaining'))],
      [require.resolve(path.join(monorepoRoot, 'node_modules/@babel/plugin-transform-nullish-coalescing-operator'))],
    ],
  };
};
