
const SIGNAL_TYPE_JOIN = "join";
const SIGNAL_TYPE_RESP_JOIN = "resp-join";
const SIGNAL_TYPE_LEAVE = "leave";
const SIGNAL_TYPE_NEW_PEER = "new-peer";
const SIGNAL_TYPE_PEER_LEAVE = "peer-leave";
const SIGNAL_TYPE_OFFER = "offer";
const SIGNAL_TYPE_ANSWER = "answer";
const SIGNAL_TYPE_CANDIDATE = "candidate";


var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

var roomId = 0;
var localUserId = Math.random().toString(36).substring(2);

var pc = null;



var localStream = null;
var remoteStream = null;

var zeroRtcEngin = null;

function handleIceCandidate(event) {
    console.info("handleIceCandidate: ", + event.candidate);
    if (event.candidate) {
        var jsonMSG = {
            'cmd': 'candidate',
            'msg': JSON.stringify(event.candidate)
        };

        var message = JSON.stringify(jsonMSG);
        zeroRtcEngin.sendMessage(message);
        console.info ("handleIceCandidate msg: " + message);

    } else {
        console.warn("End of candidates");
    }
}

function handleRemoteStreamAdd(event) {
    console.info ();
    remoteStream = event.streams[0];
    remoteVideo.srcObject = remoteStream;
}

function cretePeerConnection() {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = handleRemoteStreamAdd;

    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });
}

function createOfferAndSendMessage(session) {
    pc.setLocalDescription(session)
    .then(function(){
        var jsonMSG = {
            'cmd': 'offer',
            'msg': JSON.stringify(session)
        };

        var message = JSON.stringify(jsonMSG);
        zeroRtcEngin.sendMessage(message);
        console.info ("createOfferAndSendMessage msg: " + message);
    })
    .catch(function(error){
        console.error("createOfferAndSendMessage failed: " + error);
    }); 
}



function handleCreateOfferError(error) {
    console.error("offer setLocalDiscription failed: " + error);
}

function createAnswerAndSendMessage(session) {
    pc.setLocalDescription(session)

    .then(function(){
        var jsonMSG = {
            'cmd': 'answer',
            'msg': JSON.stringify(session)
        };

        var message = JSON.stringify(jsonMSG);
        zeroRtcEngin.sendMessage(message);
        console.info ("createAnswerAndSendMessage msg: " + message);
    })
    .catch(function(error){
        console.error("answer setLocalDiscription failed: " + error);
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
    console.log ("onMessage: " + event.data);
    var jsonMSG = JSON.parse(event.data);
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
    this.signaling.send(message);
}


zeroRtcEngin = new ZeroRtcEngin("ws://192.168.31.71:8888");
zeroRtcEngin.createWebsocket();


function handleRemoteNewPeer(message) {
    console.info("handleRemoteNewPeer: " + message);
    doOffer();
}

function handleResponseJoin(message) {
    console.info("handleResponseJoin" + message);

}

function handleRemotePeerLeave(message) {
    console.info("handleRemotePeerLeave" + message);

}

function handlerRemoteOffer(message) {
    console.info("handlerRemoteOffer" + message);
    if (pc == null) {
        cretePeerConnection();
    }

    var desc = JSON.parse(message.msg);
    pc.setRemoteDescription(desc);
    doAnswer();
}

function handleRemoteAnswer(message) {
    console.info("handleRemoteAnswer" + message);
    var desc = JSON.parse(message.msg);
    pc.setRemoteDescription(desc);

}

function handleRemoteCandidate(message) {
    console.info("handleRemoteCandidate" + JSON.stringify(message));
    var candidate = JSON.parse(message.msg);
    pc.addIceCandidate(candidate).catch(e => {
        console.error("addIceCandidate failed: " + e.name);
    });
}



function doOffer () {
    // create RTCPEERConnection
    if (pc == null) {
        cretePeerConnection();
    }

    pc.createOffer().then (createOfferAndSendMessage).catch(handleCreateOfferError);
}

function doAnswer () {
    // create RTCPEERConnection

    pc.createAnswer().then (createAnswerAndSendMessage).catch(handleCreateAnswerError) ;
}

function doJoin(roomid) {
    var jsonMSG = {
        'cmd':SIGNAL_TYPE_JOIN,
        'roomid': roomid,
        'uid': localUserId
    };
    var message = JSON.stringify(jsonMSG);
    zeroRtcEngin.sendMessage(message);
    console.info ("doJoin msg: " + message);
}

function openLocalStream(stream) {
    doJoin(roomId);
    localVideo.srcObject = stream;
    localStream = stream;
}

function initLocalStream() {
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
    roomId = document.getElementById('roomid').value;
    if (roomId == "" || roomId == "room id") {
        alert ("input room id pls");
        return;
    }
    console.log ("roomid: " + roomId);
    initLocalStream();
}
