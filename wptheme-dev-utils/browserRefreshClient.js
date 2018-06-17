if (_wpThemeBrowserRefreshServerInfo) {
    if (_wpThemeBrowserRefreshServerInfo.enable.length > 0 && _wpThemeBrowserRefreshServerInfo.port.length > 0) {
        if (_wpThemeBrowserRefreshServerInfo.enable === "true") {
            var host = `ws://localhost:${_wpThemeBrowserRefreshServerInfo.port}/`;
            var socket = new WebSocket(host);
            socket.onmessage = function(e) {
                if (e && typeof e.data === "string") {
                    console.log("e", e);
                    var msg = JSON.parse(e.data);
                    console.log(msg);
                    if (msg) {
                        switch (msg.event) {
                            case "build-success":
                                window.location.replace(window.location);
                                break;
                        }
                    }
                }
            };
        }
    }
}
