// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, create-react-wp
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
const spawn = require("react-dev-utils/crossSpawn");
const path = require("path");
const paths = require("../config/paths.wptheme");
const config = require("../config/webpack.config.wptheme.dev");
const appPackageJson = require(paths.appPackageJson);

const wpThemeUserConfig = require("../utils/wpThemeGetUserConfig")(process.env.NODE_ENV);
const wpThemePostInstallerInfo = require("../utils/wpThemePostInstallerInfo");
const wpThemeCopyFunctions = require("../utils/wpThemeCopyFunctions");
const copyPublicFolder = wpThemeCopyFunctions.copyPublicFolder;
const copyToThemeFolder = wpThemeCopyFunctions.copyToThemeFolder;

const useYarn = fs.existsSync(paths.yarnLockFile);
const isInteractive = process.stdout.isTTY;

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

    const injectBrowserRefreshClient = function() {
        if (!wpThemeUserConfig) {
            return;
        }

        let userConfig = wpThemeUserConfig.injectBrowserRefreshClient;
        if (!userConfig || typeof userConfig.mode !== "string" || userConfig.mode === "disable") {
            return;
        }

        if (typeof userConfig.override === "function") {
            userConfig.override();
            return;
        }

        if (fs.existsSync(userConfig.file)) {
            const phpStuff = "\n\n<?php $BRC_TEMPLATE_PATH = get_template_directory_uri(); $BRC_TEMPLATE_PATH = parse_url($BRC_TEMPLATE_PATH, PHP_URL_PATH); ?>";
            const jsStuff = "<script src='<?php echo $BRC_TEMPLATE_PATH; ?>/react-src/wptheme-utils/browserRefreshClient.js'></script>";

            let fileContents = fs.readFileSync(userConfig.file, "utf8");
            let toInject = null;

            switch (userConfig.mode) {
                case "appendAfterToken":
                    toInject = [phpStuff, jsStuff, userConfig.token];
                    break;
                case "appendAtEndOfFile":
                case "replaceToken":
                    toInject = [phpStuff, jsStuff];
                    break;
                default:
                    console.log(chalk.magenta(`wpstart::injectBrowserRefreshClient: unknown inject mode: ${userConfig.mode}.`));
                    console.log(`Available inject modes: ${chalk.cyan("disable, appendAtEndOfFile, appendAfterToken, replaceToken")}`);
                    process.exit();
            }

            if (userConfig.mode === "appendAtEndOfFile") {
                fileContents += toInject.join("\n");
            } else {
                fileContents = fileContents.replace(userConfig.token, toInject.join("\n"));
            }

            fs.writeFileSync(userConfig.file, fileContents);
        } else {
            console.log(chalk.red(`wpstart::injectBrowserRefreshClient: ${userConfig.file} was not found.`));
            process.exit();
        }
    };

    const webpackOutputFormat = {
        chunks: false, // Makes the build much quieter
        children: false,
        colors: true,
        modules: false
    };

    var launchBrowser = true;
    var browserRefreshServer;
    return new Promise((resolve, reject) => {
        const watchOptions = {
            aggregateTimeout: 300,
            poll: undefined
        };
        let compiler = webpack(config);
        const watcher = compiler.watch(watchOptions, (err, stats) => {
            if (err) {
                // TODO: utilize WebPackDevClient ErrorOverlay that create-react-app uses:
                // see: https://github.com/create-react-wp/create-react-wptheme/blob/create-react-wptheme/packages/react-dev-utils/webpackHotDevClient.js
                return console.log(err);
            }

            if (isInteractive) {
                clearConsole();
                console.log(stats.toString(webpackOutputFormat));
                console.log();
                console.log("Note that the development build is not optimized.");
                console.log(`To create a production build, use ${chalk.cyan("yarn wpbuild")}.`);
                console.log();
            }

            if (!stats.hasErrors()) {
                // Merge with the public folder
                copyPublicFolder();
                injectBrowserRefreshClient();
                copyToThemeFolder();

                // print the post init instructions
                if (isInteractive && wpThemePostInstallerInfo.postInstallerExists()) {
                    clearConsole();
                    console.log("Nodejs watcher is exiting...");
                    console.log("Now go to your WP site's admin area and set the site's theme to this new theme.");
                    console.log(chalk.cyan("Then load your browser once to complete the PHP portion of the setup."));
                    console.log(chalk.green("Once that is done, restart the Nodejs watcher."));

                    watcher.close();
                    process.exit();
                }

                if (launchBrowser) {
                    let browserRefreshServerPath = path.join(process.cwd(), "wptheme-utils", "browserRefreshServer.js");
                    browserRefreshServer = spawn("node", [browserRefreshServerPath], { stdio: "inherit" }, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`exec error: ${error}`);
                            process.exit();
                            return;
                        }
                        console.log(`stdout: ${stdout}`);
                        console.log(`stderr: ${stderr}`);
                    });

                    browserRefreshServer.on("close", (code) => {
                        console.error(`browserRefreshServer exited with code ${code}`);
                    });

                    const browserRefreshServerCheck = setInterval(() => {
                        if (typeof browserRefreshServer.pid === "number") {
                            launchBrowser = false;
                            openBrowser(appPackageJson.browserLaunchTo);
                            clearInterval(browserRefreshServerCheck);
                        }
                    }, 250);
                }
            }
        });

        ["SIGINT", "SIGTERM"].forEach(function(sig) {
            process.on(sig, function() {
                watcher.close();
                process.exit();
            });
        });
    });
}
