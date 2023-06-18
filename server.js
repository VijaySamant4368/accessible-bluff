var express = require("express");
var app = express()
var http = require("http").createServer(app)
var io = require("socket.io")(http)
var serverfn = require('./helpers/ServerFunctions')
var path = require('path');
const hbs = require('hbs');
// Set up the view engine to use HBS
app.set('view engine', 'hbs');
// Set the location of the views directory
app.set('views', __dirname + '/views');
app.use(express.static(path.join(__dirname, 'public')));
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
const roomCapacity = 3;//set roomcapacity
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
      passedPlayers: [],
      wonUsers:[],
      // Add other room-specific variables as needed
      lastPlayedCardCount: undefined,
      currentTurnIndex: -1,// Index of the current turn player
      playinguser: undefined,
      playinguserfail: false,
      bluff_text: undefined,
      nextPlayer: undefined,
      openedClientIndex: undefined,
      playingClientIndex: undefined,
      raiseActionDone: false,
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
    io.to(roomId).emit('STOC-SET-NUMBER-OF-PLAYERS', roomCapacity);
    assignTurns(roomId);
    setTimeout(() => {
      serverfn.delayedCode(rooms[roomId].cardset, roomCapacity, rooms[roomId].clients);
    }, 4000);
    // Execute something else during the 2-second delay
    executeDuringDelay(roomId);
    changeTurn(roomId, io);
  }
  function executeDuringDelay(roomId) {
    console.log(roomId);
    io.to(roomId).emit('STOC-SHUFFLING', 'shuffle')
  }

  socket.on('CTOS-PLACE-CARD', (selectedCards, bluff_text, remainingCards) => {
    lastPlayedCardCount = selectedCards.length;
    rooms[roomId].playinguserfail = false;
    selectedCards.forEach((card) => {
      rooms[roomId].SuitStack.push(card.suit);
      rooms[roomId].CardStack.push(card.value);
    });

    console.log("value:", rooms[roomId].CardStack);
    console.log("suit:", rooms[roomId].SuitStack);

    if (remainingCards == 0) {
      console.log("playinguser won")
      rooms[roomId].playinguserwon = true;
    }

    rooms[roomId].raiseActionDone = false;
    var clientPlaying = socket.id;
    rooms[roomId].playinguser = rooms[roomId].clients.find(client => client.id === clientPlaying);
    rooms[roomId].playingClientIndex = rooms[roomId].clients.findIndex(client => client.id === rooms[roomId].playinguser);
    console.log("PLAYING CLIENT INDEX:",rooms[roomId].playingClientIndex);
    rooms[roomId].bluff_text = bluff_text;
    console.log("input:", rooms[roomId].bluff_text);
    io.to(roomId).emit('STOC-GAME-PLAYED', lastPlayedCardCount, rooms[roomId].bluff_text)
    io.to(roomId).emit('STOC-RAISE-TIME-START');
    setTimeout(() => {
      
      if (!rooms[roomId].raiseActionDone) {
        io.to(roomId).emit('STOC-RAISE-TIME-OVER',);
        if(rooms[roomId].playinguserwon ){
          rooms[roomId].wonUsers.push(rooms[roomId].nextPlayer.position)
          io.to(roomId).emit('STOC-PLAYER-WON', rooms[roomId].nextPlayer.position);
          rooms[roomId].playinguserwon=false;
        }
        changeTurn(roomId, io);
      }

    }, 5000);
  });

  socket.on('CTOS-RAISE', () => {
    rooms[roomId].raiseActionDone = true;
    clientWhoOpened = socket.id;
    const Openedclient = rooms[roomId].clients.find(client => client.id === clientWhoOpened);
    rooms[roomId].openedClientIndex = rooms[roomId].clients.findIndex(client => client.id === clientWhoOpened);
    if (Openedclient) {
      console.log("open action done by client ");
    } else {
      console.log('Client not found or not connected');
    }
    const poppedElements = [];
    const poppedSuits = [];
    rooms[roomId].playinguserfail = false;
    for (let i = 0; i < lastPlayedCardCount; i++) {
      if (rooms[roomId].CardStack.length > 0) {
        const poppedSuit = rooms[roomId].SuitStack.pop();
        const poppedElement = rooms[roomId].CardStack.pop();
        if (poppedElement != rooms[roomId].bluff_text) {
          console.log("popped element,input", poppedElement, rooms[roomId].bluff_text);
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
    io.to(roomId).emit('STOC-SHOW-RAISED-CARDS', poppedElements, poppedSuits)

    if (rooms[roomId].playinguserfail) {
      rooms[roomId].playinguserwon = false
      console.log("cardstackback:", rooms[roomId].CardStack);
      rooms[roomId].currentTurnIndex = (rooms[roomId].openedClientIndex - 1) % rooms[roomId].clients.length;
      console.log("CURRENT INDEX OF PREVIOUS ONE:(playing user fail)", rooms[roomId].currentTurnIndex);
      rooms[roomId].playinguser.emit('STOC1C-DUMP-PENALTY-CARDS', rooms[roomId].CardStack, poppedElements, rooms[roomId].SuitStack, poppedSuits);

    } else {
      if (rooms[roomId].playinguserwon) {
        console.log("playinguser won");
        rooms[roomId].wonUsers.push(rooms[roomId].nextPlayer.position);
        io.to(roomId).playinguser.emit('STOC-PLAYER-WON', rooms[roomId].nextPlayer.position);
        rooms[roomId].playinguserwon = false
      }
      rooms[roomId].currentTurnIndex = (rooms[roomId].playingClientIndex - 1) % rooms[roomId].clients.length;
      console.log("CURRENT INDEX OF PREVIOUS ONE:(opened user fail)", rooms[roomId].currentTurnIndex);
      Openedclient.emit('STOC1C-DUMP-PENALTY-CARDS', rooms[roomId].CardStack, poppedElements, rooms[roomId].SuitStack, poppedSuits);
     }
    rooms[roomId].CardStack = [];
    rooms[roomId].SuitStack = [];
    console.log("THIS OVER");
    io.to(roomId).emit('STOC-PLAY-OVER');
    rooms[roomId].passedPlayers.length = 0;
    setTimeout(() =>{
      changeTurn(roomId);
    }, 5000);

  });

  socket.on('CTOS-PASS', (pos) => {
    rooms[roomId].passedPlayers.push(pos)
    console.log("PASSED PLAYER LENGTH , WON PLAYER LENGTH:",rooms[roomId].passedPlayers.length,rooms[roomId].wonUsers.length)
    if (rooms[roomId].passedPlayers.length===(rooms[roomId].clients.length- rooms[roomId].wonUsers.length ))
     {
      io.to(roomId).emit('STOC-PLAY-OVER');
      rooms[roomId].passedPlayers.length = 0;
      setTimeout(() => {
        pos = (pos - 1) % rooms[roomId].clients.length;
        rooms[roomId].currentTurnIndex = pos - 1;
        changeTurn(roomId);
      }, 5000);
    }
    else {
      pos = (pos - 1) % rooms[roomId].clients.length;
      //isNextPlayerPassed(pos);
      rooms[roomId].currentTurnIndex = pos - 1;
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
});

function assignTurns(roomId) {
  // Emit the turn order to each client
  rooms[roomId].clients.forEach((client, index) => {
    position = index + 1;
    client.emit('STO1C-SET-POSITION', index + 1);

    client.position = position;
  });
}

function changeTurn(roomId) {
  rooms[roomId].currentTurnIndex = (rooms[roomId].currentTurnIndex + 1) % rooms[roomId].clients.length;
  rooms[roomId].nextPlayer = rooms[roomId].clients[rooms[roomId].currentTurnIndex];
  var nextPlayerPosition = rooms[roomId].nextPlayer.position;
  console.log("nextPlayerPosition is", nextPlayerPosition);
  console.log("passedplayerarray,wonplayerarray   ",rooms[roomId].passedPlayers,rooms[roomId].wonUsers )
    if ( rooms[roomId].passedPlayers.includes(nextPlayerPosition)|| rooms[roomId].wonUsers.includes(nextPlayerPosition ))
    {
      nextPlayerPosition = (nextPlayerPosition - 1) % rooms[roomId].clients.length;
      rooms[roomId].currentTurnIndex = nextPlayerPosition;
      changeTurn(roomId);
    }
   else {
      io.to(roomId).emit('STOC-SET-WHOS-TURN', (nextPlayerPosition));
    }
  }
  
http.listen(3000, () => {
  console.log("connected to server");
}
)