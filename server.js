var express = require("express");
var app = express()
var http = require("http").createServer(app)
var io = require("socket.io")(http)
var serverfn = require('./helpers/ServerFunctions')
const hbs = require('hbs');
// Set up the view engine to use HBS
app.set('view engine', 'hbs');
// Set the location of the views directory
app.set('views', __dirname + '/views');
var Deck = require('./helpers/deck');
const { Socket } = require("socket.io");
const { TIMEOUT } = require("dns");
var router = express.Router();
const CardDeck = new Deck.Deck()
const { v4: uuidv4 } = require('uuid');
const rooms = {};
app.get('/', (req, res) => {
  res.render('game');
});
var rcount;
const roomCapacity = 2;//set roomcapacity
const roomCounts = {}
io.on('connection', (socket) => {
  console.log("New connection established. User connected with ID:", socket.id);

  // Find or create a room with available capacity
  let roomId;
  for (const [room, count] of Object.entries(roomCounts)) {
    if (count < roomCapacity) {
      roomId = room;
      break;
    }
  }
  // If no room has available capacity, create a new room
  if (!roomId) {
    roomId = uuidv4();
    CardDeck.shuffle();
    roomCounts[roomId] = 0; // Initialize the room count
    rooms[roomId] = {
      clients: [], // Array of sockets in the room
      CardStack: [], // Card stack specific to the room
      SuitStack: [], // Suit stack specific to the room
      // Add other room-specific variables as needed
      CardCount: undefined,
      currentTurnIndex: -1,// Index of the current turn player
      playinguser: undefined,

      playinguserfail: false,
      InputValue: undefined,
      nextPlayer: undefined,
      openedClientIndex: undefined,
      playingClientIndex: undefined,
      openActionDone: false,
      playinguserwon: false,
      cardset: CardDeck.cards,
      clientWhoOpened: undefined
    };
  }
  // Join the room
  socket.join(roomId);
  rooms[roomId].clients.push(socket);
  roomCounts[roomId]++; // Increment the room count

  console.log("New user joined connected with room ID: " + roomId + ", member count: " + roomCounts[roomId]);

  // If the room reaches its capacity, emit a message to restrict further entry
  if (roomCounts[roomId] >= roomCapacity) {
    assignTurns(roomId);
    setTimeout(() => {
      serverfn.delayedCode(rooms[roomId].cardset, roomCapacity, rooms[roomId].clients);
    }, 4000);
    // Execute something else during the 2-second delay
    executeDuringDelay(roomId);
    changeTurn(roomId);
  }
  function executeDuringDelay() {
    console.log(roomId);
    socket.to(roomId).emit('shufflingCards', 'shuffle');
  }
  socket.on('SelectedCards', (cardcount, cardsuit, cardvalue, containerCount) => {
    CardCount = cardcount;
    rooms[roomId].playinguserfail = false;
    console.log("the suit is:", cardsuit)
    console.log("the cardvalue is:", cardvalue)

    console.log("the cardcount is:", CardCount);
    rooms[roomId].SuitStack.push(cardsuit);
    rooms[roomId].CardStack.push(cardvalue);
    console.log("value:", rooms[roomId].CardStack);
    console.log("suit:", rooms[roomId].SuitStack);
    if (containerCount == 0) {
      console.log("playinguser won")
      rooms[roomId].playinguserwon = true;
    }

  });
  socket.on('inputData', (inputValue) => {
    //console.log("THE CARD COUNT IS:",CardCount);
    rooms[roomId].openActionDone = false;
    //console.log("OPENACTIONDONE:",openActionDone)
    var clientPlaying = socket.id;
    rooms[roomId].playinguser = rooms[roomId].clients.find(client => client.id === clientPlaying);
    rooms[roomId].playingClientIndex = rooms[roomId].clients.findIndex(client => client.id === rooms[roomId].playinguser);

    if (rooms[roomId].playinguser) {
      rooms[roomId].playinguser.emit('specificMessagetoplayinguser');
    } else {
      console.log('Client not found or not connected');
    }
    InputValue = inputValue;
    console.log("input:", InputValue);
    //io.emit('showinput',CardCount,InputValue);
    socket.to(roomId).emit('showinput', CardCount, InputValue)
    rooms[roomId].clients.forEach((client) => {
      if (client !== rooms[roomId].nextPlayer) {
        client.emit('openTimeStarts');
      }
    });
    socket.on('openTimeOver', () => {
      if (rooms[roomId].openActionDone) {
        changeTurn(roomId);
      }
    });
  });
  socket.on('opencards', () => {
    rooms[roomId].openActionDonetrue;
    clientWhoOpened = socket.id;
    const Openedclient = rooms[roomId].clients.find(client => client.id === clientWhoOpened);
    rooms[roomId].openedClientIndex = rooms[roomId].clients.findIndex(client => client.id === clientWhoOpened);
    if (Openedclient) {
      Openedclient.emit('specificMessage');
    } else {
      console.log('Client not found or not connected');
    }
    const poppedElements = [];
    const poppedSuits = [];
    rooms[roomId].playinguserfail = false;
    for (let i = 0; i < CardCount; i++) {
      if (rooms[roomId].CardStack.length > 0) {
        const poppedSuit = rooms[roomId].SuitStack.pop();
        const poppedElement = rooms[roomId].CardStack.pop();
        if (poppedElement != InputValue) {
          console.log("popped element,input", poppedElement, InputValue);
          rooms[roomId].playinguserfail = true;
          console.log("playinguserfail:", rooms[roomId].playinguserfail)
        }
        poppedElements.push(poppedElement);
        poppedSuits.push(poppedSuit);
      } else {
        break; // Stack is empty, exit the loop
      }
    }
    console.log("poppedsuits:", poppedSuits)
    socket.to(roomId).emit('showopencards', poppedElements, poppedSuits)

    if (rooms[roomId].playinguserfail) {
      rooms[roomId].playinguserwon = false
      console.log("cardstackback:", rooms[roomId].CardStack);
      rooms[roomId].currentTurnIndex = (rooms[roomId].openedClientIndex - 1) % rooms[roomId].clients.length;
      console.log("CURRENT INDEX OF PREVIOUS ONE:(playing user fail)", rooms[roomId].currentTurnIndex);
      rooms[roomId].playinguser.emit('CardsBack', rooms[roomId].CardStack, poppedElements, rooms[roomId].SuitStack, poppedSuits);
      rooms[roomId].CardStack = [];
      rooms[roomId].SuitStack = [];
      console.log("THIS OVER");
      changeTurn(roomId);
    } else {
      if (rooms[roomId].playinguserwon) {
        console.log("playinguser won");
        rooms[roomId].playinguser.emit('wonmessage');
        rooms[roomId].playinguserwon = false
      }
      rooms[roomId].currentTurnIndex = (rooms[roomId].playingClientIndex - 1) % rooms[roomId].clients.length;
      console.log("CURRENT INDEX OF PREVIOUS ONE:(opened user fail)", rooms[roomId].currentTurnIndex);

      Openedclient.emit('CardsBack', rooms[roomId].CardStack, poppedElements, rooms[roomId].SuitStack, poppedSuits);
      rooms[roomId].CardStack = [];
      rooms[roomId].SuitStack = [];
      console.log("THIS OVER");
      changeTurn(roomId);
    }
  });
  socket.on('disconnect', () => {
    console.log(" user disconnected with roomID:" + roomId + 'member' + roomCounts[roomId])
    rcount = roomCounts[roomId];
    rcount--// Decrement the room count
    console.log("the room count is:", rcount)
    if (roomCounts[roomId] <= 0) {
      delete roomCounts[roomId]; // Remove the room if there are no more users
      console.log("room ented")
    }
  })
  //}
});
/* function emitClientList() {
   // Create an array of client IDs
   const clientIds = connectedClients.map(socket => socket.id);
   // Emit the updated client list to all clients
  // io.emit('updateClientList', clientIds);
 }*/
function assignTurns(roomId) {
  // Emit the turn order to each client
  rooms[roomId].clients.forEach((client, index) => {
    client.emit('playOrder', index + 1);
  });
}
function changeTurn(roomId) {
  rooms[roomId].currentTurnIndex = (rooms[roomId].currentTurnIndex + 1) % rooms[roomId].clients.length;
  rooms[roomId].nextPlayer = rooms[roomId].clients[rooms[roomId].currentTurnIndex];

  // Emit an event to the next player indicating it's their turn
  rooms[roomId].nextPlayer.emit('nextTurn');
}
http.listen(3000, () => {
  console.log("connected to server");
}
)