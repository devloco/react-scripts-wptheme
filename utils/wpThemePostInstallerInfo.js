// @remove-on-eject-begin
/**
 * Copyright (c) 2015-present, create-react-wp
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// @remove-on-eject-end
"use strict";

const fs = require("fs");
const path = require("path");
const paths = require("../config/paths.wptheme");
const postInstallerName = "post_installer.php";

module.exports = {
    postInstallerExists: function() {
        try {
            fs.accessSync(path.join(paths.appPublic, postInstallerName), fs.constants.F_OK);
            return true;
        } catch (err) {
            return false;
        }
    },
    postInstallerName: postInstallerName
};
