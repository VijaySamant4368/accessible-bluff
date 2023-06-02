var express =require("express");
var app = express()
var http =require("http").createServer(app)
var io =require("socket.io")(http)
var serverfn=require('./helpers/ServerFunctions')
const hbs = require('hbs');
// Set up the view engine to use HBS
app.set('view engine', 'hbs');
// Set the location of the views directory
app.set('views', __dirname + '/views');
var Deck=require('./helpers/deck')
const { Socket } = require("socket.io");
var router = express.Router();
const CardDeck =new Deck.Deck()
CardDeck.shuffle()
let connectedClients = [];
let CardCount;
let currentTurnIndex = 0; // Index of the current turn player
let userfail=false;
var CardStack=[];
var InputValue;
var cardset=CardDeck.cards
let clientWhoOpened = null;

app.get('/', (req, res) => {
  res.render('game');
});
var rcount;
const roomCapacity=2;
const roomCounts={};
io.on('connection', (socket) => {
 // Store the connected client
 //connectedClients.push(socket.id);
 connectedClients.push(socket);
 // Send the partitioned cards to all clients

    // Find or create a room with available capacity
    console.log("new connection established a user connected with ID:", socket.id)

    let roomId;
    for (const [room, count] of Object.entries(roomCounts)) {
      if (count < roomCapacity) {
        roomId = room;
        break;
      }
    }

    // If no room has available capacity, create a new room
    if (!roomId) {
      roomId = socket.id; // Use socket ID as room ID
      roomCounts[roomId] = 0; // Initialize the room count
    }
    // Join the room
    socket.join(roomId);
    roomCounts[roomId]++; // Increment the room count
    console.log("new user joined connected with roomID:"+roomId+ 'member'+roomCounts[roomId]) 
    // If the room reaches its capacity, emit a message to restrict further entry
if (roomCounts[roomId] >= roomCapacity) {
  emitClientList(connectedClients) ;
  assignTurns(connectedClients);
// Execute something else during the 2-second delay
// Delayed code execution after 4 seconds
setTimeout(() => {
  serverfn.delayedCode(cardset, roomCapacity, connectedClients);
}, 4000);
// Execute something else during the 2-second delay
console.log("roomid:"+roomId)
executeDuringDelay();
    }
   function executeDuringDelay(){
      console.log(roomId);
      io.to(roomId).emit('shufflingCards', 'shuffle');
      console.log("the cards are shuffling......")
      // Place your additional code here
    }
    
    socket.on('SelectedCards',(cardcount,cardsuit,cardvalue)=>
  {
  CardCount=cardcount;
  var Cardsuit=cardsuit;
  console.log(cardvalue)
    CardStack.push(cardvalue);
   console.log("value:",CardStack);
  // io.emit('cardd',CardCount)
  });
  socket.on('inputData', (inputValue) => {
    InputValue= inputValue;
console.log(InputValue);

    // Handle the received data as per your requirements
  }); 
 
  socket.on('opencards',()=>{
    clientWhoOpened = socket.id;
    const Openedclient = connectedClients.find(client => client.id === clientWhoOpened);
  if (Openedclient) {
    Openedclient.emit('specificMessage');
  } else {
    console.log('Client not found or not connected');
  }
const poppedElements = [];
for (let i = 0; i < CardCount; i++) {
  if (CardStack.length > 0) {
    const poppedElement = CardStack.pop();
    if(poppedElement!=InputValue){
     userfail=true;
    }

    poppedElements.push(poppedElement);
  } else {
    break; // Stack is empty, exit the loop
  }
}
console.log(userfail)
if (Openedclient&&userfail) {
  console.log("cardstackback:",CardStack);
  Openedclient.emit('CardsBack',CardStack);
} else {
  console.log('Client not found or not connected');
}

console.log("popped elements:",poppedElements)
io.emit('showopencards',poppedElements)
  });
//socket.emit('showopencards',(poppedElements))
    // Handle socket disconnection
    socket.on('disconnect', () => {
    console.log( " user disconnected with roomID:"+roomId+ 'member'+roomCounts[roomId])
      rcount=roomCounts[roomId]; 
      rcount--// Decrement the room count
      console.log("the room count is:",rcount)
      if (roomCounts[roomId] <= 0) {
        delete roomCounts[roomId]; // Remove the room if there are no more users
        console.log("room ented")
      }
    })
  });
//////
 //function GameStarts() {
   // let connectedClients = []; // Array of connected clients
    //let currentTurnIndex = 0; // Index of the current turn player
    
   /* io.on('connection', (socket) => {
      // Add client's socket to the connectedClients array
      connectedClients.push(socket);
    
      // Emit the updated client list to all clients
      emitClientList();
    
      socket.on('disconnect', () => {
        // Remove client's socket from the connectedClients array
        connectedClients = connectedClients.filter(client => client !== socket);
    
        // Emit the updated client list to all clients
        emitClientList();
      });
    });*/
    function emitClientList() {
      // Create an array of client IDs
      const clientIds = connectedClients.map(socket => socket.id);
      // Emit the updated client list to all clients
     // io.emit('updateClientList', clientIds);
    }
    function assignTurns() {
      // Emit the turn order to each client
      connectedClients.forEach((client, index) => {
        client.emit('playOrder', index + 1);
      });
    }
    function changeTurn() {
      currentTurnIndex = (currentTurnIndex + 1) % connectedClients.length;
      const nextPlayer = connectedClients[currentTurnIndex];
      
      // Emit an event to the next player indicating it's their turn
      nextPlayer.emit('nextTurn');
    }
  //}
  //////
http.listen(3000,()=>{ 
    console.log("connected to server");
}
)