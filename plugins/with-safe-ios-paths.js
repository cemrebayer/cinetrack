const { withXcodeProject } = require("expo/config-plugins");
module.exports = (config) =>
  withXcodeProject(config, (config) => {
    const phases =
      config.modResults.hash.project.objects.PBXShellScriptBuildPhase;
    for (const phase of Object.values(phases)) {
      if (typeof phase !== "object" || !phase.shellScript) continue;
      const source = JSON.parse(phase.shellScript);
      const fixed = source.replace(
        /`("\$NODE_BINARY" --print [^\n]+)`/g,
        '"$($1)"',
      );
      phase.shellScript = JSON.stringify(fixed);
    }
    return config;
  });
