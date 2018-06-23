// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
"use strict";

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on("unhandledRejection", (err) => {
    throw err;
});

// Ensure environment variables are read.
require("../config/env");

const path = require("path");
const chalk = require("chalk");
const fs = require("fs-extra");
const webpack = require("webpack");
const config = require("../config/webpack.config.wptheme.prod");
const paths = require("../config/paths.wptheme");
const checkRequiredFiles = require("react-dev-utils/checkRequiredFiles");
const clearConsole = require("react-dev-utils/clearConsole");
const formatWebpackMessages = require("react-dev-utils/formatWebpackMessages");
const printHostingInstructions = require("react-dev-utils/printHostingInstructions");
const FileSizeReporter = require("react-dev-utils/FileSizeReporter");
const printBuildError = require("react-dev-utils/printBuildError");

const measureFileSizesBeforeBuild = FileSizeReporter.measureFileSizesBeforeBuild;
const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;
const useYarn = fs.existsSync(paths.yarnLockFile);

const wpThemePostInstallerInfo = require("@devloco/create-react-wptheme-utils/postInstallerInfo");
const wpThemeCopyFunctions = require("@devloco/create-react-wptheme-utils/copyFunctions");
const copyPublicFolder = wpThemeCopyFunctions.copyPublicFolder;
const copyToThemeFolder = wpThemeCopyFunctions.copyToThemeFolder;

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
    process.exit(1);
}

// First, read the current file sizes in build directory.
// This lets us display how much they changed later.
measureFileSizesBeforeBuild(paths.appBuild)
    .then((previousFileSizes) => {
        // Remove all content but keep the directory so that
        // if you're in it, you don't end up in Trash
        fs.emptyDirSync(paths.appBuild);
        // Merge with the public folder
        copyPublicFolder(paths);
        // Start the webpack build
        return build(previousFileSizes);
    })
    .then(
        ({ stats, previousFileSizes, warnings }) => {
            if (warnings.length) {
                console.log(chalk.yellow("Compiled with warnings."));
                console.log();
                console.log(warnings.join("\n\n"));
                console.log();
                console.log("Search for the " + chalk.underline(chalk.yellow("keywords")) + " to learn more about each warning.");
                console.log("To ignore, add " + chalk.cyan("// eslint-disable-next-line") + " to the line before.");
                console.log();
            } else {
                console.log(chalk.green("Compiled successfully."));
                console.log();
            }

            console.log("File sizes after gzip:");
            console.log();
            printFileSizesAfterBuild(stats, previousFileSizes, paths.appBuild, WARN_AFTER_BUNDLE_GZIP_SIZE, WARN_AFTER_CHUNK_GZIP_SIZE);
            console.log();

            const appPackage = require(paths.appPackageJson);
            const publicUrl = paths.publicUrl;
            const publicPath = config.output.publicPath;
            const buildFolder = path.relative(process.cwd(), paths.appBuild);
            printHostingInstructions(appPackage, publicUrl, publicPath, buildFolder, useYarn);
        },
        (err) => {
            console.log(chalk.red("Failed to compile."));
            console.log();
            printBuildError(err);
            process.exit(1);
        }
    );

// Create the production build and print the deployment instructions.
function build(previousFileSizes) {
    clearConsole();
    console.log(chalk.green("Creating an optimized production build..."));
    console.log();

    // print the post init instructions
    if (wpThemePostInstallerInfo.postInstallerExists()) {
        const displayedCommand = useYarn ? "yarn" : "npm";
        clearConsole();
        console.error(chalk.red("wpbuild is exiting..."));
        console.log("You haven't yet completed the PHP portion of your new theme's setup.");
        console.log("You must: " + chalk.magenta(`${displayedCommand} ${useYarn ? "" : "run "}wpstart`));
        console.log(chalk.cyan("Then load your browser once to complete the PHP portion of the setup."));
        console.log("Once that is done, you may retry wpbuild.");
        process.exit(1);
    }

    let compiler = webpack(config);
    return new Promise((resolve, reject) => {
        compiler.run((err, stats) => {
            if (err) {
                return reject(err);
            }
            const messages = formatWebpackMessages(stats.toJson({}, true));
            if (messages.errors.length) {
                // Only keep the first error. Others are often indicative
                // of the same problem, but confuse the reader with noise.
                if (messages.errors.length > 1) {
                    messages.errors.length = 1;
                }
                return reject(new Error(messages.errors.join("\n\n")));
            }
            if (process.env.CI && (typeof process.env.CI !== "string" || process.env.CI.toLowerCase() !== "false") && messages.warnings.length) {
                console.log();
                console.log(chalk.yellow("Treating warnings as errors because process.env.CI = true."));
                console.log(chalk.yellow("Most CI servers set it automatically."));
                console.log();
                return reject(new Error(messages.warnings.join("\n\n")));
            }

            copyToThemeFolder(paths);

            return resolve({
                stats,
                previousFileSizes,
                warnings: messages.warnings
            });
        });
    });
}
