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
const paths = require("../config/paths.wptheme");
const wpThemePostInstallerInfo = require("../wptheme-dev-utils/postInstallerInfo");

module.exports = {
    copyPublicFolder: function() {
        fs.copySync(paths.appPublic, paths.appBuild, {
            dereference: true,
            filter: (file) => file !== paths.appHtml && file.indexOf("index.html") == -1 && file.indexOf(wpThemePostInstallerInfo.postInstallerName) == -1
        });
    },
    copyToThemeFolder: function() {
        fs.copySync(paths.appBuild, "..", {
            dereference: true
        });
    }
};
