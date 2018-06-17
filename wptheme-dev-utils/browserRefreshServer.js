"use strict";

//const chokidar = require("chokidar");
const WebSocket = require("ws");

let _server;
const _sendMessage = function(event) {
    if (_server) {
        _server.clients.forEach(function each(ws) {
            if (ws.isAlive === true) {
                let now = new Date().getTime().toString();
                let msg = {
                    event: event,
                    now: now
                };

                ws.send(JSON.stringify(msg));

                if (event === "build-success") {
                    console.log("Browser refresh sent.");
                }
            }
        });
    }
};

module.exports = {
    startServer: function(portNum) {
        const port = parseInt(process.env.PORT, 10) || portNum || 8090;
        if (port > 0) {
            setTimeout(() => {
                startServer(port);
                console.log("Browser refresh server ready.");
            }, 0);
        }
    },
    sendMessage: function(msgType, msgInfo) {
        _sendMessage(msgType, msgInfo);
    }
};

function startServer(portNum) {
    _server = new WebSocket.Server({ port: portNum });

    const noop = function() {};

    const heartbeat = function() {
        this.isAlive = true;
    };

    // var watcher = chokidar.watch(serverConfig.watchFile, {
    //     persistent: true,
    //     ignored: false,
    //     ignoreInitial: true,
    //     followSymlinks: true,
    //     cwd: ".",
    //     disableGlobbing: false,
    //     usePolling: true,
    //     interval: 100,
    //     binaryInterval: 300,
    //     alwaysStat: false,
    //     depth: 2,
    //     awaitWriteFinish: {
    //         stabilityThreshold: 250,
    //         pollInterval: 100
    //     },
    //     ignorePermissionErrors: false,
    //     atomic: true
    // });

    // watcher
    //     .on("add", function(path) {
    //         return null;
    //     })
    //     .on("change", function(path) {
    //         _sendMessage("change");
    //     })
    //     .on("unlink", function(path) {
    //         return null;
    //     })
    //     .on("addDir", function(path) {
    //         return null;
    //     })
    //     .on("unlinkDir", function(path) {
    //         return null;
    //     })
    //     .on("error", function(error) {
    //         console.log(`BrowserRefreshServer::chokidar error: ${error}`);
    //         return null;
    //     })
    //     .on("ready", function() {
    //         console.log("Browser refresh server ready.");
    //     })
    //     .on("raw", function(event, path, details) {
    //         return null;
    //     });

    _server.on("connection", function connection(ws) {
        ws.isAlive = true;
        ws.on("pong", heartbeat);
    });

    _server.on("close", (code) => {
        console.error(`browserRefreshServer exited with code ${code}`);
    });

    const interval = setInterval(function ping() {
        _server.clients.forEach(function each(ws) {
            if (ws.isAlive === false) {
                console.log("Browser refresh server: CONNECTION TERMINATED", ws);
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping(noop);
        });
    }, 30000);
}
