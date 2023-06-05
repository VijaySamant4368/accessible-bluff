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
let playinguser;
let playinguserfail=false;
var CardStack=[];
var SuitStack=[];
var InputValue;
var cardset=CardDeck.cards
let clientWhoOpened = null;
app.get('/', (req, res) => {
  res.render('game');
});
var rcount;
const roomCapacity=2;//set roomcapacity
const roomCounts={};
io.on('connection', (socket) => {
 // Store the connected client
 connectedClients.push(socket);
    console.log("new connection established a user connected with ID:", socket.id)
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
// Delayed code execution after 4 seconds
setTimeout(() => {
  serverfn.delayedCode(cardset, roomCapacity, connectedClients);
}, 4000);
console.log("roomid:"+roomId)
// Execute something else during the 2-second delay
executeDuringDelay();
    }
   function executeDuringDelay(){
      console.log(roomId);
      io.to(roomId).emit('shufflingCards', 'shuffle');
      console.log("the cards are shuffling......")
    }
    socket.on('SelectedCards',(cardcount,cardsuit,cardvalue)=>
  {
  CardCount=cardcount;
  playinguserfail=false;
  console.log("the suit is:",cardsuit)
  console.log("the cardvalue is:",cardvalue)

  console.log("the cardcount is:",CardCount);
    SuitStack.push(cardsuit);
    CardStack.push(cardvalue);
   console.log("value:",CardStack);
   console.log("suit:",SuitStack);

  });
  socket.on('inputData', (inputValue) => {
   var clientPlaying= socket.id;
     playinguser = connectedClients.find(client => client.id === clientPlaying);
    if (playinguser) {
      playinguser.emit('specificMessagetoplayinguser');
    } else {
      console.log('Client not found or not connected');
    }
    InputValue= inputValue;
console.log("input:",InputValue);

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
const  poppedSuits=[];
playinguserfail=false;

for (let i = 0; i < CardCount; i++) {
  if (CardStack.length > 0) {
    const poppedSuit = SuitStack.pop();
    const poppedElement = CardStack.pop();
    if(poppedElement!=InputValue){
      console.log("popped,input",poppedElement,InputValue);
     playinguserfail=true;
   console.log("playinguserfail:",playinguserfail)
    }
    poppedElements.push(poppedElement);
    poppedSuits.push(poppedSuit);
  } else {
    break; // Stack is empty, exit the loop
  }
}

/*function combineStacks(poppedElements,CardStack) {
  const cardsGivingBack = [];

  // Push values from stack1 to the combinedStack
  while (poppedElements.length > 0) {
    cardsGivingBack.push(poppedElements.pop());
  }

  // Push values from stack2 to the combinedStack
  while (stack2.length > 0) {
    cardsGivingBack.push(CardStack.pop());
  }

  return cardsGivingBack;
}*/


if (playinguserfail) {
  console.log("cardstackback:",CardStack);
  playinguser.emit('CardsBack',CardStack,poppedElements);
      CardStack=[];
      SuitStack =[];
      
  
} else {
  Openedclient.emit('CardsBack',CardStack,poppedElements);
  //Openedclient.emit('CardsBack',stackedCards,stackOfSuits);

  
  CardStack=[];
  SuitStack =[];
}
console.log("popped elements:",poppedElements)
console.log("popped suit:",poppedSuits)
io.emit('showopencards',poppedElements,poppedSuits)
  });

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
  
http.listen(3000,()=>{ 
    console.log("connected to server");
}
)