// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, devloco
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
"use strict";

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = "development";
process.env.NODE_ENV = "development";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
    throw err;
});

// Ensure environment variables are read.
require("../config/env");

const fs = require("fs-extra");
const chalk = require("chalk");
const webpack = require("webpack");
const clearConsole = require("react-dev-utils/clearConsole");
const checkRequiredFiles = require("react-dev-utils/checkRequiredFiles");
const openBrowser = require("react-dev-utils/openBrowser");
// const spawn = require("react-dev-utils/crossSpawn");
// const path = require("path");
const paths = require("../config/paths.wptheme");
const config = require("../config/webpack.config.wptheme.dev");
const appPackageJson = require(paths.appPackageJson);

const wpThemeUserConfig = require("@devloco/react-scripts-wptheme-utils/getUserConfig")(paths, process.env.NODE_ENV);
const wpThemePostInstallerInfo = require("@devloco/react-scripts-wptheme-utils/postInstallerInfo");
const wpThemeCopyFunctions = require("@devloco/react-scripts-wptheme-utils/copyFunctions");
const copyPublicFolder = wpThemeCopyFunctions.copyPublicFolder;
const copyToThemeFolder = wpThemeCopyFunctions.copyToThemeFolder;

const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

let _wpThemeServer =
    wpThemeUserConfig && wpThemeUserConfig.wpThemeServer && wpThemeUserConfig.wpThemeServer.enable === true ? require("@devloco/react-scripts-wptheme-utils/wpThemeServer") : null;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
    process.exit(1);
}

// Using setTimeout just to put the call to startWatch() at the top of the file.
setTimeout(() => {
    startWatch();
}, 0);

function startWatch() {
    // Remove all content but keep the directory so that
    // if you're in it, you don't end up in Trash
    fs.emptyDirSync(paths.appBuild);

    const injectWpThemeClient = function(wpThemeServer) {
        if (!wpThemeUserConfig) {
            return;
        }

        let clientConfig = wpThemeUserConfig.injectWpThemeClient;
        if (!clientConfig || typeof clientConfig.mode !== "string" || clientConfig.mode === "disable") {
            return;
        }

        if (typeof clientConfig.override === "function") {
            clientConfig.override.call();
            return;
        }

        let toInject = wpThemeServer.getClientInjectString(clientConfig.mode, clientConfig.token);

        if (fs.existsSync(clientConfig.file)) {
            let fileContents = fs.readFileSync(clientConfig.file, "utf8");

            if (clientConfig.mode === "endOfFile") {
                fileContents += toInject;
            } else {
                fileContents = fileContents.replace(clientConfig.token, toInject);
            }

            fs.writeFileSync(clientConfig.file, fileContents);
        } else {
            console.log(chalk.red(`wpstart::injectWpThemeClient: ${clientConfig.file} was not found.`));
            process.exit();
        }
    };

    let doLaunchBrowser = true;
    const launchBrowser = function() {
        openBrowser(appPackageJson.browserLaunchTo);
    };

    const webpackOutputFormat = {
        chunks: false, // Makes the build much quieter
        children: false,
        colors: true,
        modules: false
    };

    return new Promise((resolve, reject) => {
        const watchOptions = {
            aggregateTimeout: 300,
            poll: undefined
        };

        let compiler = webpack(config);
        const watcher = compiler.watch(watchOptions, (err, stats) => {
            if (err) {
                // starting the watcher failed.
                return console.log(err);
            }

            if (isInteractive) {
                let buildCommand = useYarn ? "yarn build" : "npm run build";
                clearConsole();
                console.log(stats.toString(webpackOutputFormat));
                console.log();
                console.log("Note that the development build is not optimized.");
                console.log(`To create a production build, use ${chalk.cyan(buildCommand)}.`);
                console.log();
            }

            if (doLaunchBrowser && _wpThemeServer) {
                _wpThemeServer.startServer(paths);
            }

            if (!stats.hasErrors()) {
                // Merge with the public folder
                copyPublicFolder(paths);
                injectWpThemeClient(_wpThemeServer);
                copyToThemeFolder(paths);

                // print the post init instructions
                if (doLaunchBrowser && isInteractive && wpThemePostInstallerInfo.postInstallerExists(paths)) {
                    clearConsole();
                    console.log("Nodejs watcher is exiting...");
                    console.log("Now go to your WP site's admin area and set the site's theme to this new theme.");
                    console.log(`Then click "${chalk.cyan("View Site")}" to complete the PHP portion of the setup.`);
                    console.log(chalk.green("Once that is done, restart the Nodejs watcher."));

                    watcher.close();
                    process.exit();
                }
            }

            if (_wpThemeServer) {
                _wpThemeServer.update(stats);
            }

            if (doLaunchBrowser) {
                launchBrowser();
            }

            doLaunchBrowser = false;
        });

        ["SIGINT", "SIGTERM"].forEach(function(sig) {
            process.on(sig, function() {
                watcher.close();
                process.exit();
            });
        });
    });
}
