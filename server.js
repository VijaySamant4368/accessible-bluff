var express =require("express");
var app = express()
var http =require("http").createServer(app)
var io =require("socket.io")(http)
const hbs = require('hbs');

var io=require("socket.io")(http)
// Set up the view engine to use HBS
app.set('view engine', 'hbs');

// Set the location of the views directory
app.set('views', __dirname + '/views');

var Deck=require('./helpers/deck')
var express = require('express');
const { Socket } = require("socket.io");
var router = express.Router();
const CardDeck =new Deck.Deck()
CardDeck.shuffle()
app.get("/home",(req,res)=>
{
  res.render('home');
   // console.log(CardDeck.cards)
})
/*app.get("/login",(req,res)=>
{
  res.render('login');
   // console.log(CardDeck.cards)
})*/
app.get("/",(req,res)=>
{
    var cardset=CardDeck.cards
  res.render('game',{cardset});
   // console.log(CardDeck.cards)
})
var rcount;
const roomCapacity=2;
const roomCounts={};
io.on('connection', (socket) => {
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
      io.to(roomId).emit('roomFull');
    }
  
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
    });

    socket.on(' customRoomEvent',(card)=>{
        console.log(card);
       io.to(roomId).emit('customRoomResponse',' response')
    });
  });

//

http.listen(3000,()=>{ 
    console.log("connected to server");
}
)