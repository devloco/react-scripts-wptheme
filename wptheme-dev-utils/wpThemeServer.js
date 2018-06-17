"use strict";

const WebSocket = require("ws");

const _typeBuildError = "errors";
const _typeBuildSuccess = "content-changed";
const _typeBuildWarning = "warnings";

var _server;
var _lastStats = null;
var _lastBuildEvent = null;
var _sendMessage = (buildEvent, stats) => {
    if (_server) {
        _server.clients.forEach((ws) => {
            if (ws.isAlive === true) {
                let msg = JSON.stringify({
                    now: new Date().getTime().toString(),
                    stats: stats.toJson("normal"),
                    type: buildEvent
                });

                ws.send(msg);

                if (buildEvent === _typeBuildSuccess) {
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
            startServer(port);
            console.log("Browser refresh server ready.");
        }
    },
    update: function(stats) {
        if (stats) {
            _lastStats = stats;
            if (stats.hasErrors()) {
                _lastBuildEvent = _typeBuildError;
                _sendMessage(_typeBuildError, stats);
            } else if (stats.hasWarnings()) {
                _lastBuildEvent = _typeBuildWarning;
                _sendMessage(_typeBuildWarning, stats);
            } else {
                _lastBuildEvent = _typeBuildSuccess;
                _sendMessage(_typeBuildSuccess, stats);
            }
        }
    }
};

function startServer(portNum) {
    _server = new WebSocket.Server({ port: portNum });

    const noop = function() {};

    const heartbeat = function() {
        this.isAlive = true;
    };

    _server.on("connection", (ws) => {
        ws.isAlive = true;
        ws.on("pong", heartbeat);

        if (_lastBuildEvent !== null && _lastBuildEvent !== _typeBuildSuccess) {
            _sendMessage(_lastBuildEvent, _lastStats);
        }
    });

    _server.on("close", (code) => {
        console.error(`wpThemeServer exited with code ${code}`);
    });

    const interval = setInterval(() => {
        _server.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                console.log("Browser refresh server: CONNECTION TERMINATED", ws);
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping(noop);
        });
    }, 30000);
}
