const { withAppDelegate } = require("expo/config-plugins");
module.exports = (config) =>
  withAppDelegate(config, (config) => {
    const marker = "#if DEBUG\n";
    const source = config.modResults.contents;
    if (!source.includes('jsLocation = "localhost:8083"')) {
      config.modResults.contents = source.replace(
        marker,
        marker +
          '    #if targetEnvironment(simulator)\n    RCTBundleURLProvider.sharedSettings().jsLocation = "localhost:8083"\n    #endif\n',
      );
    }
    return config;
  });
