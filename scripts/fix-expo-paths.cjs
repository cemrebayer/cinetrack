// Expo SDK 54's constants script needs quoted paths in workspaces containing spaces.
const fs = require("node:fs");
const path = require("node:path");
const root = path.dirname(require.resolve("expo-constants/package.json"));
const podspec = path.join(root, "ios/EXConstants.podspec");
let source = fs.readFileSync(podspec, "utf8");
source = source.replace(
  /    :script => .*get-app-config-ios\.sh.*\n/,
  `    :script => 'bash "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"',\n`,
);
fs.writeFileSync(podspec, source);
const script = path.join(root, "scripts/get-app-config-ios.sh");
fs.writeFileSync(
  script,
  fs
    .readFileSync(script, "utf8")
    .replace("$(basename $PROJECT_DIR)", '$(basename "$PROJECT_DIR")'),
);
