var ws = require("nodejs-websocket")
var port = 8888;

const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join";
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";

var paticipant = new Set (); 

function handleJoin (message, conn) {
    var roomId = message.roomid;
    var uid = message.uid;

    if (!paticipant.has(conn)) {
        paticipant.add(conn);
        console.log ("handleJoin: " + paticipant.size);
    }

    var jsonMSG = {
        'cmd' : SIGNAL_TYPE_NEW_PEER
    };

    handleForward(jsonMSG, conn);

    var jsonMSG = {
        'cmd' : SIGNAL_TYPE_RESP_JOIN
    };

    conn.sendText(JSON.stringify(jsonMSG));

    console.info ("uid: " + uid + "want to join room: " + roomId);
}

function handleForward(message, conn) {

    paticipant.forEach(function(ws){
        try {
            if (ws !== conn) {
                ws.sendText(JSON.stringify(message));
            }
            
        } catch(e) {
            console.error("handleForward: " + e.code);
        }
    })
}

var server = ws.createServer(function(conn) {
    console.log ("create a new conn");
   // conn.sendText("got your conn");
    conn.on ("text", function(str) {
        console.info("recv msg: " + str);
        var jsonMSG = JSON.parse(str);
        switch (jsonMSG.cmd) {
            case SIGNAL_TYPE_JOIN:
                handleJoin(jsonMSG, conn);
                break;
            case SIGNAL_TYPE_LEAVE:

            break;
            case SIGNAL_TYPE_OFFER:
                handleForward(jsonMSG, conn);
            break;
            case SIGNAL_TYPE_ANSWER:
                handleForward(jsonMSG, conn);
            break;
            case SIGNAL_TYPE_CANDIDATE:
                handleForward(jsonMSG, conn);
            break;
        }
    });

    conn.on ("close", function(code, reason){
        if (paticipant.has(conn)) {
            paticipant.delete(conn);
            console.log ("onClose: " + paticipant);
        }
        console.info("conn closed code: " + code, ", reason: " + reason);
    });

    conn.on ("error", function(err){
        console.error("got error: " + err);
    })
}).listen(port);