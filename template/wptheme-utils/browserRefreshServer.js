"use strict";

const chokidar = require("chokidar");
const WebSocket = require("ws");
const wpThemeUserConfig = require("../node_modules/react-scripts/utils/wpThemeGetUserConfig")("dev");
const serverConfig = wpThemeUserConfig ? wpThemeUserConfig.browserRefreshServer : null;

if (serverConfig && serverConfig.enable) {
    const portNum = parseInt(process.env.PORT, 10) || serverConfig.port || 8090;
    if (portNum > 0) {
        setTimeout(() => {
            startServer(portNum);
        }, 0);
    }
}

function startServer(portNum) {
    const wss = new WebSocket.Server({ port: portNum });
    const noop = function() {};
    const forceRefresh = function() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === true) {
                let now = new Date().getTime().toString();
                ws.send(now);
                console.log("Browser refresh sent.");
            }
        });
    };
    const heartbeat = function() {
        this.isAlive = true;
    };

    var watcher = chokidar.watch(serverConfig.watchFile, {
        persistent: true,
        ignored: false,
        ignoreInitial: true,
        followSymlinks: true,
        cwd: ".",
        disableGlobbing: false,
        usePolling: true,
        interval: 100,
        binaryInterval: 300,
        alwaysStat: false,
        depth: 2,
        awaitWriteFinish: {
            stabilityThreshold: 250,
            pollInterval: 100
        },
        ignorePermissionErrors: false,
        atomic: true
    });

    watcher
        .on("add", function(path) {
            return null;
        })
        .on("change", function(path) {
            forceRefresh();
        })
        .on("unlink", function(path) {
            return null;
        })
        .on("addDir", function(path) {
            return null;
        })
        .on("unlinkDir", function(path) {
            return null;
        })
        .on("error", function(error) {
            console.log(`BrowserRefreshServer::chokidar error: ${error}`);
            return null;
        })
        .on("ready", function() {
            console.log("Browser refresh server ready.");
        })
        .on("raw", function(event, path, details) {
            return null;
        });

    wss.on("connection", function connection(ws) {
        ws.isAlive = true;
        ws.on("pong", heartbeat);
    });

    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) {
                console.log("Browser refresh server: CONNECTION TERMINATED", ws);
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping(noop);
        });
    }, 30000);
}
