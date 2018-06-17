// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, devloco
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
"use strict";

const fs = require("fs-extra");
const chalk = require("chalk");
const path = require("path");
const paths = require("../config/paths.wptheme");
const wpThemePostInstallerInfo = require("../utils/wpThemePostInstallerInfo");
const appPackageJson = require(paths.appPackageJson);

const defaultUserDevConfig = {
    fileWatcherPlugin: {
        touchFile: "./public/index.php",
        ignored: "./public/index.php",
        watchFileGlobs: ["./public/**/*.js", "./public/**/*.css", "./public/**/*.php"]
    },
    browserRefreshServer: {
        enable: true,
        port: 8090,
        watchFile: "../index.php"
    },
    injectBrowserRefreshClient: {
        override: null,
        mode: "appendAfterToken",
        token: "</body>",
        file: "./build/index.php"
    }
};

const defaultUserProdConfig = {
    ensureTrailingSlash: true,
    homepage: appPackageJson.homepage
};

function writeUserConfig(configName, configString) {
    let configPath = path.join(paths.appPath, configName);
    fs.writeFileSync(configPath, configString);
}

function getUserConfig(configName, defaultConfig) {
    let userConfig = null;
    try {
        userConfig = require(path.join(paths.appPath, configName));
    } catch (err) {
        userConfig = JSON.stringify(defaultConfig, null, 4);
        writeUserConfig(configName, userConfig);
        return defaultConfig;
    }

    return userConfig;
}

const userDevConfigName = "user.dev.json";
const userProdConfigName = "user.prod.json";

// Create both files asap.
if (!wpThemePostInstallerInfo.postInstallerExists()) {
    getUserConfig(userDevConfigName, defaultUserDevConfig);
    getUserConfig(userProdConfigName, defaultUserProdConfig);
}

module.exports = function(nodeEnv) {
    if (wpThemePostInstallerInfo.postInstallerExists()) {
        return null;
    }

    if (typeof nodeEnv !== "string") {
        nodeEnv = process.env.NODE_ENV;
    }

    switch (nodeEnv) {
        case "dev":
        case "development":
            return getUserConfig(userDevConfigName, defaultUserDevConfig);
            break;
        case "build":
        case "prod":
        case "production":
            return getUserConfig(userProdConfigName, defaultUserProdConfig);
            break;
        default:
            console.log(chalk.red(`Unknown env.NODE_ENV: ${nodeEnv}`));
            return null;
    }
};
