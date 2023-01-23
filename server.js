const websocket = require ('ws').Server;
const msgpack = require('msgpack');

let server = new websocket({port: 3000});

let clients = [];
let users = [];

function createMessage(senderId, command, target, data) {
  //let msg = msgpack.pack(data);
  delete data["Command"]
  let msg = JSON.stringify(data);
  let ret = { 
    "UserId" : senderId,
    "Target" : target,
    "Command" : command,
    "Data" :msg
  };
  return ret;
}

function execMessage(message) {
  let data = JSON.parse(message);
  let userId = data["UserId"];
  switch(data["Command"])
  {
    case "Join":
      return joinRoom(userId, data);
      
    case "ChatMsg":
      return createMessage(userId, "ChatMsg", "All", data);
  }
}


function heartbeat() {
  this.isAlive = true;
}

function joinRoom(userId, data) {
  users.push(data);
  return createMessage(userId, "Join", "All", users);
}



function BroadCast(data) {
  let msg = JSON.stringify(data);
  //let msg = msgpack.pack(data);
  clients.forEach(function each(cli) {
    let sendTarget = true;
    switch(data.Target)
    {
    case "All":
      break;
    case "Other":
      if(cli.UserId == data.UserId) sendTarget = false;
      break;
    }
    
    if(!sendTarget) return ;
    
    cli.Client.send (msg);
    console.log("send:" + msg);
  });
};

server.on ('connection', function (ws) {
  ws.on('pong', heartbeat);
  ws.on('message', function (message) {
    var now = new Date();
    console.log (now.toLocaleString() + ' Received: %s', message);
    
    try
    {
      let result = execMessage(message);
      
      //クライアントを登録
      if(result["Command"] == "Join"){
        let userId = result["UserId"];
        clients.push({
          "UserId" : userId,
          "Client": ws
        });
      }
      
      BroadCast(result);
    }
    catch(ex)
    {
      console.log(ex);
    }
  });
  
  //Joinをもらうためにエコーバック
  let echoback = createMessage("None", "JoinCall", "Self", "None");
  //echoback = msgpack.pack(echoback);
  echoback = JSON.stringify(echoback);
  ws.send(echoback);
});

const interval = setInterval(function ping() {
  server.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();

    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

server.on('close', function close() {
  clearInterval(interval);
});