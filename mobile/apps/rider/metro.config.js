const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const sharedPkg = path.resolve(monorepoRoot, 'packages/shared');
const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedPkg, monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

config.resolver.blockList = [
  /@easyryde[/\\]shared[/\\]node_modules/,
  new RegExp(path.resolve(monorepoRoot, 'packages/shared/node_modules') + '/'),
];

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && req.url.includes('/hot')) {
        res.writeHead(404);
        res.end('HMR disabled');
        return;
      }
      middleware(req, res, next);
    };
  },
};

module.exports = config;
