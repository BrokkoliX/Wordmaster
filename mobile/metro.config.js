const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

// Watch the shared directory for changes.
config.watchFolders = [sharedRoot];

// Resolve 'shared/...' imports to the shared directory at the repo root.
config.resolver.extraNodeModules = {
  shared: sharedRoot,
};

// Ensure node_modules resolution still works from the project root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
