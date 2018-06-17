var host = "ws://localhost:8090/";
var socket = new WebSocket(host);
socket.onmessage = function(e) {
    window.location.replace(window.location);
};
