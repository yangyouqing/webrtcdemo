
const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join";
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";

var defaultConfiguration = {
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceTransportPolicy: "relay",
    iceServers:[
        {
            "urls":[
                "turn:43.128.22.4:3478?transport=udp",
                "turn:43.128.22.4:3478?transport=tcp"
            ],
            "username": "yq",
            "credential": "123456"
        },
        {
            "urls":[
                "stun:43.128.22.4:3478"
            ]
        }
    ]
};

var tcpConfiguration = {
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceTransportPolicy: "relay",
    iceServers:[
        {
            "urls":[
                "turn:192.168.31.49:3478?transport=tcp"
            ],
            "username": "yq",
            "credential": "123456"
        },
    ]
};

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

var roomId = 0;
var localUserId = Math.random().toString(36).substring(2);

var pc = null;
var role = "";


var localStream = null;
var remoteStream = null;

var zeroRtcEngin = null;

function handleIceCandidate(event) {
    console.info(role + ": onicecandidate: handleIceCandidate: ");
    if (event.candidate) {
        var jsonMSG = {
            'cmd': 'candidate',
            'msg': JSON.stringify(event.candidate)
        };

        var message = JSON.stringify(jsonMSG);
        zeroRtcEngin.sendMessage(message);
        console.info ("handleIceCandidate send candidate to server: " + message);

    } else {
        console.warn(role + ": End of candidates");
    }
}

function handleRemoteStreamAdd(event) {
    console.info ("ontrack handleRemoteStreamAdd");
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
}

function cretePeerConnection() {
    console.log (role + ": cretePeerConnection");
    pc = new RTCPeerConnection(tcpConfiguration);
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = handleRemoteStreamAdd;

    localStream.getTracks().forEach((track) => {
        console.log ("PeerConnection addTrack: " );
        Object.keys(track ).map(key => {
            console.log(key + ": " + track[key]) 
        });
        pc.addTrack(track, localStream);
    });
}

function createOfferAndSendMessage(session) {
    console.log ("createOfferAndSendMessage");
    console.log ("PeerConnection setLocalDescription: " + JSON.stringify(session));
    pc.setLocalDescription(session)
    .then(function(){
        var jsonMSG = {
            'cmd': 'offer',
            'msg': JSON.stringify(session)
        };

        var message = JSON.stringify(jsonMSG);
        zeroRtcEngin.sendMessage(message);
        console.info (role + ": createOfferAndSendMessage send offer to server: " + message);
    })
    .catch(function(error){
        console.error("createOfferAndSendMessage failed: " + error);
    }); 
}



function handleCreateOfferError(error) {
    console.error("offer setLocalDiscription failed: " + error);
}

function createAnswerAndSendMessage(session) {
    console.log ("createAnswerAndSendMessage");
    console.log ("PeerConnection setLocalDescription: " + session);
    pc.setLocalDescription(session)
    
    .then(function(){
        var jsonMSG = {
            'cmd': 'answer',
            'msg': JSON.stringify(session)
        };

        var message = JSON.stringify(jsonMSG);
        zeroRtcEngin.sendMessage(message);
        console.info ("createAnswerAndSendMessage send answer to server: " + message);
    })
    .catch(function(error){
        console.error("answer setLocalDescription failed: " + error);
    });
}



function handleCreateAnswerError(error) {
    console.error("answer setLocalDiscription failed: " + error);
}



var ZeroRtcEngin = function(wsurl) {
    this.init(wsurl);
    zeroRtcEngin = this;
    return this;
};

ZeroRtcEngin.prototype.init = function(wsUrl) {
    this.wsUrl = wsUrl;
    this.signaling = null;
}

ZeroRtcEngin.prototype.createWebsocket = function() {
    console.log ("createWebsocket");
    zeroRtcEngin = this;
    zeroRtcEngin.signaling = new WebSocket(this.wsUrl);
    zeroRtcEngin.signaling.onopen  = function(event) {
        zeroRtcEngin.onOpen(event);
    }

    zeroRtcEngin.signaling.onmessage = function(event) {
        zeroRtcEngin.onMessage(event);
    }

    zeroRtcEngin.signaling.onerror = function(event) {
        zeroRtcEngin.onError(event);
    }

    zeroRtcEngin.signaling.onclose = function(ev) {
        zeroRtcEngin.onClose();
    }
}

ZeroRtcEngin.prototype.onOpen = function(event) {
    console.log ("websocket opened");
}


ZeroRtcEngin.prototype.onMessage = function(event) {
    var jsonMSG = JSON.parse(event.data);
    console.log (role + ": got msg from server, msg type: " + jsonMSG.cmd);

    switch (jsonMSG.cmd) {
        case SIGNAL_TYPE_NEW_PEER:
            handleRemoteNewPeer(jsonMSG);
        break;
        case SIGNAL_TYPE_RESP_JOIN:
            handleResponseJoin(jsonMSG);
        break;
        case SIGNAL_TYPE_PEER_LEAVE:
            handleRemotePeerLeave(jsonMSG);
        break;
        case SIGNAL_TYPE_OFFER:
            handlerRemoteOffer(jsonMSG);
        break;

        case SIGNAL_TYPE_ANSWER:
            handleRemoteAnswer(jsonMSG);
        break;
        case SIGNAL_TYPE_CANDIDATE:
            handleRemoteCandidate(jsonMSG);
        break;

    }
}

ZeroRtcEngin.prototype.onError = function (event) {
    console.log ("onError: " + event.data);
}

ZeroRtcEngin.prototype.onClose = function(event) {
    console.log("onClose: " + event.code + ",reason: " + event.reason);
}

ZeroRtcEngin.prototype.sendMessage = function (message) {
   // console.log ("send message to server");
    this.signaling.send(message);
}


zeroRtcEngin = new ZeroRtcEngin("ws://192.168.31.71:8888");
zeroRtcEngin.createWebsocket();


function handleRemoteNewPeer(message) {
    role = "client";
    console.info(role + ": This is new peer join: " + JSON.stringify(message));
    doOffer();
}

function handleResponseJoin(message) {
    role = "peer";
    console.info(role + ": handleResponseJoin" + JSON.stringify(message));
}

function handleRemotePeerLeave(message) {
    console.info("handleRemotePeerLeave" + JSON.stringify(message));

}

function handlerRemoteOffer(message) {
    console.info(role + ": handlerRemoteOffer");
    if (pc == null) {
        cretePeerConnection();
    }

    var desc = JSON.parse(message.msg);
    console.log ("PeerConnection setRemoteDescription: " + desc);
    pc.setRemoteDescription(desc);
    doAnswer();
}

function handleRemoteAnswer(message) {
    console.info(role + ": handleRemoteAnswer");
    var desc = JSON.parse(message.msg);

    console.log ("PeerConnection setRemoteDescription: " + message);
    pc.setRemoteDescription(desc);
}

function handleRemoteCandidate(message) {
    console.info(role + ": handleRemoteCandidate" + JSON.stringify(message));
    var candidate = JSON.parse(message.msg);

    console.log ("PeerConnection addIceCandidate: " + candidate);
    pc.addIceCandidate(candidate).catch(e => {
        console.error("addIceCandidate failed: " + e.name);
    });
}



function doOffer () {
    console.log (role + ": doOffer");
    // create RTCPEERConnection
    if (pc == null) {
        cretePeerConnection();
    }

    console.log ("PeerConnection: createOffer");
    pc.createOffer().then (createOfferAndSendMessage).catch(handleCreateOfferError);
}

function doAnswer () {
    console.log (role + ": doAnswer");

    // create RTCPEERConnection

    console.log ("PeerConnection: createAnswer");
    pc.createAnswer().then (createAnswerAndSendMessage).catch(handleCreateAnswerError) ;
}

function doJoin(roomid) {
    console.log (role + ": doJoin");
    var jsonMSG = {
        'cmd':SIGNAL_TYPE_JOIN,
        'roomid': roomid,
        'uid': localUserId
    };
    var message = JSON.stringify(jsonMSG);
    zeroRtcEngin.sendMessage(message);
    console.info ("doJoin send join to server : " + message);
}

function openLocalStream(stream) {
    console.log (role + ": openLocalStream");
    doJoin(roomId);
    localVideo.srcObject = stream;
    localStream = stream;
}

function initLocalStream() {
    console.log (role + ": initLocalStream");

    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    .then(openLocalStream)
    .catch(function(e) {
        alert("getUserMedia error: " + e.name);
    });

}

document.getElementById('joinBtn').onclick = function(){
    console.log (role + ": onclick");

    roomId = document.getElementById('roomid').value;
    if (roomId == "" || roomId == "room id") {
        alert ("input room id pls");
        return;
    }
    console.log ("roomid: " + roomId);
    initLocalStream();
}
