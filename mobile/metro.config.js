// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase JS SDK ships an `exports` map whose default/browser entries pull in
// web-only code that crashes in React Native. Disabling package-exports
// resolution makes Metro fall back to the SDK's RN-compatible CJS build.
// (Standard fix for Firebase + Expo SDK 53+.)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
