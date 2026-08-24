const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/shared'),
  path.resolve(monorepoRoot, 'packages/api-client'),
  path.resolve(monorepoRoot, 'packages/ui-kit'),
  monorepoRoot,
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.blockList = [
  /@easyryde[/\\]shared[/\\]node_modules/,
  new RegExp(path.resolve(monorepoRoot, 'packages/shared/node_modules') + '/'),
];

module.exports = config;
