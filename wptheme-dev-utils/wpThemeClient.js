if (_wpThemeServerInfo) {
    if (_wpThemeServerInfo.enable.length > 0 && _wpThemeServerInfo.port.length > 0) {
        if (_wpThemeServerInfo.enable === "true") {
            var wpThemeClient = {
                start: function() {
                    var host = "ws://localhost:" + _wpThemeServerInfo.port;
                    var socket = new WebSocket(host);

                    socket.onmessage = function(response) {
                        if (response && typeof response.data === "string") {
                            try {
                                var msg = JSON.parse(response.data);
                                console.log(msg);
                                if (msg) {
                                    switch (msg.type) {
                                        case "content-changed":
                                            window.location.reload();
                                            break;
                                        case "errors":
                                            console.log("ERRORS", msg.stats.errors);
                                            break;
                                        case "warnings":
                                            console.log("WARNINGS", msg.stats.warnings);
                                            break;
                                    }
                                }
                            } catch (err) {
                                if (typeof console !== "undefined" && typeof console.error === "function") {
                                    console.error(err);
                                    console.log("Raw websocket message:", response);
                                }
                            }
                        }
                    };

                    socket.onclose = function() {
                        if (typeof console !== "undefined" && typeof console.info === "function") {
                            console.info("The browser refresh server has disconnected.\nRefresh the page if necessary.");
                        }
                    };
                }
            };

            wpThemeClient.start();
        }
    }
}
