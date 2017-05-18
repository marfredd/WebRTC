
var IDCam = [];
var IDLaptopCam = "09a22789e16320492fb4828896307b5239daba8c73c7c0ee50b4885866a0a484";
var IDLogitechCam = "c8ff00967512d6c1e329b156e3c0f647dac4dab8fdf44a2bfc52a3be70992070";
var IDStandingCam = "7e57893ca041464a2f519196ebf49bbe15ab97c4e66ad57443e5a582175d74ec";

$(function(){
  var socket = io('http://192.168.43.62:7766');
  var messages = [];
  var peer_id, name, conn;
  var messages_template = Handlebars.compile($('#messages-template').html());

  var config = {
     host: '192.168.43.62',
    // host: '188.166.227.167',
    // host: 'localhost',
    port: 9001,
    path: '/peerjs',
    debug: 3,
    config: {'iceServers': [
    { url: 'stun:stun1.l.google.com:19302' },
    { url: 'turn:numb.viagenie.ca',
      credential: 'muazkh', username: 'webrtc@live.com' }
    ]}
  }

  navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

  function getVideo(callback){
    navigator.getUserMedia({audio: true, video: true}, callback, function(error){
      console.log(error);
      alert('An error occured. Please try again');
    });
  }

  getVideo(function(stream){
    window.localStream = stream;
    onReceiveStream(stream, 'my-camera');
    activePeer = createNewPeer(window.localStream)
  });

  function onReceiveStream(stream, element_id){
    console.log('element id = ' + element_id);
    var video = $('#' + element_id + ' video')[0];
    video.src = window.URL.createObjectURL(stream);
    window.peer_stream = stream;
  }

  //////////////////////////

  var activePeer;
  var peers = [];



  // $('#login').click(function(){
  //   peer_id = $('#peer_id').val();
  //   if(peer_id){
  //     globalPeerId = peer_id;
  //     conn = activePeer.connect(peer_id, {metadata: {
  //       'username': 'name'
  //     }});
  //     conn.on('data', activePeer.handleMessage);
  //     conn.on('close', peer.cleanup);
  //     $('#ids').append(peer_id + '\n');
  //     activePeer.dataConnection = conn;
  //     // call peer straight away
  //     activePeer.initiateCall();
  //     // create new peer
  //     activePeer = createNewPeer();
  //   }
  //
  //   $('#chat').removeClass('hidden');
  //   // $('#connect').addClass('hidden');
  // });


  var connected = false;
  $('#btnSchool').click(function(){
    connected = true;
    socket.emit('data', JSON.stringify({
        school: $('#school').val(),
        id: activePeer.id
    }));
  });


  socket.on('dataid', function(peer_id){
      // peer_id = data;
      // globalPeerId = peer_id;
      conn = activePeer.connect(peer_id);
      conn.on('data', activePeer.handleMessage);
      activePeer.conn = conn;
      $('#ids').append(peer_id + '\n');
      // call peer straight away
      activePeer.initiateCall(peer_id);
      // create new peer
      activePeer = createNewPeer(window.localStream);

      $('#chat').removeClass('hidden');
      console.log(peer_id);
  });


  function createNewPeer(stream, idx = -1) {

    var peer = new Peer($.extend({}, config, {stream: stream}));
    var globalPeerId = undefined;
    var globalPeerIndex = undefined;
    peer.conn = undefined;

    peer.on('open', function(){
      $('#id').text(peer.id);

      if (idx == -1) {
        peers.push(peer);
        globalPeerIndex = peers.length;
        console.log('PEERS PUSH #' + globalPeerIndex + ': ' + peer.id)
      } else {
        // ask the other peer to connect to this one
        peers[idx].inform(peer.id);
        peers[idx] = peer;
        globalPeerIndex = idx + 1;
      }
      if (connected) {
        socket.emit('data', JSON.stringify({
          school: $('#school').val(),
          id: activePeer.id
        }));
      }
    });

    function inform(peer_id) {
      peer.conn.send({
        peer_id: peer_id
      });
      setTimeout(function () {
        peer.destroy();
      }, 5000);
    }
    peer.inform = inform;

    function cleanup () {
      console.log('Cleanup. idx = ' + globalPeerIndex);
      // $('#peer-camera' + globalPeerIndex + ' video').hide();
    }
    peer.cleanup = cleanup;

    peer.on('close', cleanup);

    $('#closePeer').click(function(){
      peer.destroy();
    });

    peer.on('connection', function(connection){
      conn = connection;
      peer_id = connection.peer;
      conn.on('data', handleMessage);
      conn.on('close', cleanup);
      peer.conn = conn;

      activePeer = createNewPeer(stream);

      // $('#peer_id').addClass('hidden').val(peer_id);
      // $('#connected_peer_container').removeClass('hidden');
      // $('#connected_peer').text(peer_id);
    });

    function handleMessage(data){
      console.log('HANDLE MESSAGE: ', data);
      if (!data.peer_id) return;
      conn = peer.connect(data.peer_id);
      conn.on('data', handleMessage);
      peer.initiateCall(data.peer_id);
    }

    function sendMessage(){
      var text = $('#message').val();
      var data = {'from': name, 'text': text};

      conn.send(data);
      handleMessage(data);
      $('#message').val('');
    }

    $('#message').keypress(function(e){
      if(e.which == 13){
        sendMessage();
      }
    });

    $('#send-message').click(sendMessage);

    function initiateCall(peer_id){
      console.log('now calling #' + globalPeerIndex + ': ' + peer_id);
      // console.log(peer);
      var call = peer.call(peer_id, stream);
      call.on('stream', function(peerStream){
        window.peer_stream = peerStream;
        onReceiveStream(peerStream, 'peer-camera' + globalPeerIndex);
      });
    }

    peer.initiateCall = initiateCall;
    peer.handleMessage = handleMessage;

    peer.on('call', function(call){
      onReceiveCall(call);
    });

    function onReceiveCall(call){
      call.answer(window.localStream);
      call.on('stream', function(stream){
        window.peer_stream = stream;
        onReceiveStream(stream, 'peer-camera' + globalPeerIndex);
      });
    }

    return peer;
  }

  /////////////////////////////////


  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
  }

  function gotDevices(devices) {
    var n = 0;
    for (var i = 0; i !== devices.length; ++i) {
      var deviceInfo = devices[i];
      var option = document.createElement('option');
      option.value = deviceInfo.deviceId;
      IDCam[n] = deviceInfo.deviceId;
      n++;

      if (deviceInfo.kind === 'videoinput') {
        option.text = deviceInfo.label || 'Camera ' + (videoSelect.length + 1);
        $('#select-camera').append(option);
        console.log(option.value);
      }
    }
  }

  navigator.mediaDevices.enumerateDevices().then(gotDevices)
    .catch(function(err) {
      console.log(err);
    });

  // $('#select-camera').change(function () {
  // var videoSource = $('#select-camera').val();
  //   console.log('selecting camera ' + videoSource);
  //   var constraints = {
  //     video: {deviceId: {exact: videoSource},
  //             width: { max: 360 },
  //             height: { max: 240 }}
  //   };
  //
  //   navigator.getUserMedia(constraints, function (stream) {
  //     console.log('receiving stream');
  //     window.localStream = stream;
  //     onReceiveStream(stream, 'my-camera');
  //
  //     activePeer = createNewPeer(stream, peers.length - 1);
  //     peers.forEach(function (peer, i) {
  //       if (i == peers.length - 1) return;
  //       createNewPeer(stream, i);
  //     });
  //   }, function (err) {
  //     console.log(err);
  //     alert('An error occured. Please try again')
  //   });
  // });

//  var prev = null;
//  setInterval(function() {
//    axios.get('/code.txt')
//      .then(function(data){
//        if ((prev && prev != data.data)) {
//          var codeString = parseInt(data.data, 10);
//
//        if(codeString == 1) {
//            videoSource = IDLogitechCam;
//          } else if (codeString == 2){
//            videoSource = IDLaptopCam;
//          } else if (codeString == 3){
//            videoSource = IDStandingCam;
//          } else {
//          }
//
//        console.log('selecting camera ' + videoSource);
//          var constraints = {
//            video: {deviceId: {exact: videoSource},
//                    width: { max: 360 },
//                    height: { max: 240 }}
//          };
//
//          navigator.getUserMedia(constraints, function (stream) {
//            console.log('receiving stream');
//            window.localStream = stream;
//            onReceiveStream(stream, 'my-camera');
//
//            activePeer = createNewPeer(stream, peers.length - 1);
//            peers.forEach(function (peer, i) {
//              if (i == peers.length - 1) return;
//              createNewPeer(stream, i);
//            });
//          }, function (err) {
//            console.log(err);
//            alert('An error occured. Please try again')
//          });
//        }
//        prev = data.data;

//      })
//  }, 3000);
//
});
