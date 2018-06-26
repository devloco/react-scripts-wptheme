// @remove-file-on-eject
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
"use strict";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
    throw err;
});

const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const shelljs = require("@devloco/react-scripts-wptheme-utils/shell-js");

module.exports = function(appPath, appName, verbose, originalDirectory, template, readmeExists) {
    const appPackageJson = require(path.join(appPath, "package.json"));
    const useYarn = fs.existsSync(path.join(appPath, "yarn.lock"));
    const reactSrcName = "react-src";

    let aOriginalDirectory = originalDirectory.replace(/\\/g, "/").split("/");
    let originalThemeName = aOriginalDirectory[aOriginalDirectory.length - 1];

    // Prefix the original create-react-app script rules with "cra"
    // so that wptheme can take over the start and build commands.
    const craCommandNames = ["build", "eject", "start", "test"];
    craCommandNames.forEach((commandName) => {
        let scriptRule = appPackageJson.scripts[commandName];
        appPackageJson.scripts["cra" + commandName] = scriptRule;
        delete appPackageJson.scripts[commandName];
    });

    // Setup the wptheme script rules
    const buildCommandName = "build";
    const startCommandName = "start";
    const commandNames = [buildCommandName, startCommandName, "wpbuild", "wpstart"];
    commandNames.forEach((commandName) => {
        appPackageJson.scripts[`${commandName}`] = `wptheme-scripts ${commandName}`;
    });

    // Set the app name correctly
    appPackageJson.name = originalThemeName;

    // rewrite package.json
    fs.writeFileSync(path.join(appPath, "package.json"), JSON.stringify(appPackageJson, null, 2));

    // Update the theme's style.css file with the Theme Name
    let styleCssFile = path.join(appPath, "/public/style.css");
    let fileContents = fs.readFileSync(styleCssFile, "utf8");
    let result = fileContents.replace(/REPLACE_WITH_THEME_NAME/g, originalThemeName);
    fs.writeFileSync(styleCssFile, result, "utf8", "w");

    // if we're not on Windows, then try to chmod the folder so that the PHP portion of
    // the setup can complete (the webserver needs write access to package.json)
    if (process.platform !== "win32") {
        function setReadWrite(file) {
            try {
                shelljs.chmod("go+w", file);
            } catch (error) {
                console.log();
                console.log();
                console.log(chalk.magenta("OS ERROR changing file permissions on:\n"));
                console.log("    " + file);
                console.log("The OS error is:", error);
                console.log();
                console.log(`${chalk.yellow("The PHP portion of setup might fail.")} Your webserver needs write access to this file to complete the setup.`);
            }
        }

        let files = [path.join(appPath, "package.json"), path.join(appPath, "/public/index.php"), path.join(appPath, "/public/post_installer.php")];
        files.forEach((file) => {
            setReadWrite(file);
        });
    }

    // Display the most elegant way to cd.
    // This needs to handle an undefined originalDirectory for
    // backward compatibility with old global-cli's.
    let cdpath;
    if (originalDirectory && path.join(originalDirectory, appName) === appPath) {
        appName = path.join(originalThemeName, reactSrcName);
        cdpath = appName;
    } else {
        appPath = path.join(originalThemeName, reactSrcName);
        cdpath = appPath;
    }

    // Change displayed command to yarn instead of yarnpkg
    const displayedCommand = useYarn ? "yarn" : "npm";

    console.log();
    console.log(`Success! Created ${originalThemeName} at ${appPath}`);
    console.log("Inside that directory, you can run several commands:");
    console.log();
    console.log("The original create-react-scripts commands are still available but must be prefixed with 'cra' (e.g. crastart, craeject, etc.).");
    console.log();
    console.log(chalk.cyan(`  ${displayedCommand} ${startCommandName}`));
    console.log("    Starts the development watcher.");
    console.log();
    console.log(chalk.cyan(`  ${displayedCommand} ${useYarn ? "" : "run"} ${buildCommandName}`));
    console.log("    Bundles the theme files for production.");
    console.log();
    console.log("We suggest that you begin by typing:");
    console.log();
    console.log(chalk.cyan("  cd"), cdpath);
    console.log(`  ${chalk.cyan(`${displayedCommand} ${startCommandName}`)}`);

    if (readmeExists) {
        console.log();
        console.log(chalk.yellow("You had a `README.md` file, we renamed it to `README.old.md`"));
    }

    console.log();
    console.log("Happy hacking!");
};
