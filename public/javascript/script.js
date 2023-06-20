  var pos;
  var next;

  var socket = io();

  // To prevent adding listeners while sorting
  var listenNodeInserted = true;

  function notifyScreenReader(text, priority) {
    var el = document.createElement("div");
    var id = "speak-" + Date.now();
    el.setAttribute("id", id);
    el.setAttribute("aria-live", priority || "polite");
    //el.classList.add("visually-hidden");
    document.body.appendChild(el);

    window.setTimeout(function () {
      document.getElementById(id).innerHTML = text;
    }, 100);

    window.setTimeout(function () {
        document.body.removeChild(document.getElementById(id));
    }, 10000);
}

  const card_container = document.getElementById('card-container');
  card_container.addEventListener("DOMNodeInserted", function(){

      if(listenNodeInserted){
        console.log("Item added to container cards")

        const card_id = card_container.lastChild.id;
        
        ['click','keydown'].forEach( function(evt) {

          card_container.lastElementChild.addEventListener(evt, (event) => {

            if(evt == 'click' || (evt == 'keydown' && event.keyCode == 13) ){

              const card = document.getElementById(card_id);

              const selectionContainer = document.getElementById('container_placing');

              const newCard2 = document.createElement('div');
              newCard2.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
              newCard2.id = card.id;
              newCard2.setAttribute('tabindex', '1');
              newCard2.setAttribute('role', 'button');
              newCard2.setAttribute('title', 'on selected');
              newCard2.textContent = card.textContent;

              notifyScreenReader("Card "+card.textContent+" added.")

              selectionContainer.appendChild(newCard2);

              card_container.removeChild(card);
            }

          }, { once: true });
        });
      }
  });

  const placing_container = document.getElementById('container_placing');
  placing_container.addEventListener("DOMNodeInserted", function(){

    console.log("Item added to container placing")
    const card_id = placing_container.lastChild.id;

    ['click','keydown'].forEach( function(evt) {
      placing_container.lastChild.addEventListener(evt, (event) => {

        if(evt == 'click' || (evt == 'keydown' && event.keyCode == 13) ){
          const card = document.getElementById(card_id);

          const card_container = document.getElementById('card-container');

          const newCard2 = document.createElement('div');
          newCard2.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
          newCard2.id = card.id;
          newCard2.setAttribute('tabindex', '1');
          newCard2.setAttribute('role', 'button');
          newCard2.setAttribute('title', 'on deck');
          newCard2.textContent = card.textContent;

          notifyScreenReader("Card "+card.textContent+" removed.")

          card_container.appendChild(newCard2);

          placing_container.removeChild(card);

          // Sort array while adding each item 
          listenNodeInserted = false;
          sort_cards('card-container')
          listenNodeInserted = true;
        }

      }, { once: true });
    });

  });



  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === ';') {
      passaction();
    }
    else if (event.key.toLowerCase() === 'r') {
      raisecards();
    }
    else if (event.key.toLowerCase() === 'p') {
      placeCards();
    }
    else if (event.key.toLowerCase() === 'f') {
      card_container.firstChild.focus();
    }
    else if (event.key.toLowerCase() === 'j') {
      card_container.lastChild.focus();
    }
    else if (event.key.toLowerCase() === 'd') {
      placing_container.firstElementChild.focus();
    }
    else if (event.key.toLowerCase() === 'k') {
      placing_container.lastChild.focus();
    }
    else if (event.key.toLowerCase() === 's') {
      const playedContainer = document.getElementById('container_played');
      playedContainer.firstElementChild.focus();
    }
    else if (event.key.toLowerCase() === 'l') {
      const playedContainer = document.getElementById('container_played');
      playedContainer.lastChild.focus();
    }
    else if (event.key.toLowerCase() === 'h'){
      var messageSelectedCards = "Selected cards : ";
      for (var i=0; i<placing_container.children.length; i++) {
        messageSelectedCards = messageSelectedCards.concat(placing_container.children[i].textContent+" ");
      }
      notifyScreenReader(messageSelectedCards);
    }



    return true;
  });

  socket.on('STOC-SET-NUMBER-OF-PLAYERS', (total) => {
    const playerContainer = document.getElementById('player-container')
    for (i = 1; i <= total; i++) {
      playerContainer.innerHTML += `<div class="user p-1" tabindex="0"><i class="far fa-user"></i><span id="user${i}">user${i}</span></div>`
    }
  })

  socket.on('STO1C-SET-POSITION', (index) => {
    pos = index;
    var player = document.getElementById(`user${pos}`)
    player.innerHTML = ''
    player.innerText = 'You'
    console.log("playorder:", index);
    notifyScreenReader("You are in position : "+index, "polite");
  });

  function startShufflingEffect() {
    // Get the card container element
    const cardContainer = document.getElementById('card-container');
    // Create loading animation and text elements
    const loadingAnimation = document.createElement('div');
    loadingAnimation.classList.add('loading-animation');
    const textElement = document.createElement('div');
    textElement.classList.add('text-element');
    textElement.classList.add('col-12')

    textElement.textContent = 'Card is shuffling';
    // Append loading animation and text elements to the card container
    cardContainer.innerHTML = '';
    cardContainer.appendChild(loadingAnimation);
    cardContainer.appendChild(textElement);
    // Remove loading animation and text elements after 4 seconds
    setTimeout(() => {
      cardContainer.innerHTML = '';
    }, 3000);
  }

  socket.on('STOC-SHUFFLING', (data) => {
    console.log(data)
    notifyScreenReader("Card is shuffling!");
    startShufflingEffect();
  });


  function get_value(item){
    if (item === 'A')
      return 1;
    else if (item === 'J')
      return 11;
    else if (item === 'Q')
      return 12;
    else if (item === 'K')
      return 13;
    else
      return parseInt(item)
  }

  function sort_cards(container_id){
    var childrens = document.getElementById(container_id).children;
    console.log('Sorting cards in '+container_id);

    childrensArray = Array.prototype.slice.call(childrens, 0);

    childrensArray.sort(function(a, b) {
        // Slice() is used instead [1] to get input '10'
        var aord = a.textContent.slice(1);
        var bord = b.textContent.slice(1);
        var a = get_value(aord);
        var b = get_value(bord);
        return a-b;
    });

    var parent = document.getElementById(container_id);
    parent.innerHTML = "";

    for(var i = 0, l = childrensArray.length; i < l; i++) {
      parent.appendChild(childrensArray[i]);
    }
  }

  socket.on('STO1C-DRAW-CARDS', (subpartition) => {
    console.log("received subpartition:", subpartition);
    const cardContainer = document.getElementById('card-container');
    cardContainer.innerHTML = '';
    // Loop through each card in the subpartition array
    subpartition.forEach((card) => {
      // Create a new card element
      const newCard = document.createElement('div');
      newCard.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      newCard.id = card.suit + card.value;
      newCard.setAttribute('tabindex', '1');
      newCard.setAttribute('role', 'button');
      newCard.setAttribute('title', 'on deck');
      newCard.textContent = card.suit + card.value;

      // Append the card to the card container;
      cardContainer.appendChild(newCard);
    });
    listenNodeInserted = false;
    sort_cards('card-container');
    listenNodeInserted = true;

    notifyScreenReader("Cards received!", "assertive");
  });

  socket.on('STOC-SET-WHOS-TURN', (nextPlayerPosition) => {
    next = nextPlayerPosition;
    console.log("next player is:player", next);
    if (next === pos) {
      console.log("your turn comes");
      const placeBtn = document.getElementById('place-btn')
      placeBtn.disabled = false;
      //Fixme : pass button should not be visible on new game start
      const passBtn = document.getElementById('pass-btn')
      passBtn.disabled = false;
      notifyScreenReader("It's your turn!", "assertive");
    }
    else {
      const placeBtn = document.getElementById('place-btn')
      placeBtn.disabled = true;
      const passBtn = document.getElementById('pass-btn')
      passBtn.disabled = true;
      notifyScreenReader("It's "+next+" turn!", "assertive");
    }
  });

  const placeCards = () => {
    var cardContainer = document.getElementById('card-container');
    var cards_remaining = cardContainer.childElementCount;

    var bluff_text=prompt("Please enter bluff text","Bluff here");
    if (bluff_text==null){
       notifyScreenReader("Canceled!")
       return;
    }

    const selectionContainer = document.getElementById('container_placing');
    var selectedCards = [];
    for (var i=0; i<selectionContainer.children.length; i++) {
      const cardObject = {
        suit: selectionContainer.children[i].textContent.slice(0, 1),
        value: selectionContainer.children[i].textContent.slice(1)
      };
      selectedCards.push(cardObject);       
    }
    socket.emit('CTOS-PLACE-CARD', selectedCards, bluff_text, cards_remaining);
    selectionContainer.innerHTML = '';    
    const placeBtn = document.getElementById('place-btn')
    placeBtn.disabled = true;
    notifyScreenReader("Cards placed!", "assertive");
  }

  socket.on('STOC-RAISE-TIME-START', () => {
    console.log("raise time starts");
    if (pos != next) {
      const raiseBtn = document.getElementById('raise-btn')
      raiseBtn.disabled = false;
    }
    notifyScreenReader("Raise time starts!", "assertive");
  });

  socket.on('STOC-RAISE-TIME-OVER', () => {
    console.log("raise time over")
    const raiseBtn = document.getElementById('raise-btn')
    raiseBtn.disabled = true;
    notifyScreenReader("Raise time over!", "assertive");
  });

  socket.on('STOC-GAME-PLAYED', (CardCount, bluffText) => {
    console.log("STOC-GAME-PLAYED:", CardCount, bluffText)
    const playingContainer = document.getElementById('container_played');
    for (var i = 1; i <= CardCount; i++) {
      // Create a new card element
      const newCard = document.createElement('div');
      newCard.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      newCard.id = bluffText;
      newCard.setAttribute('tabindex', '1');
      newCard.setAttribute('role', 'button');
      newCard.setAttribute('title', 'on played');
      newCard.textContent = bluffText;
      // Append the card to the card container;
      playingContainer.appendChild(newCard);
    }
    notifyScreenReader("Game played. "+CardCount+" cards played as "+bluffText, "assertive");
  });

  function raisecards() {
    console.log("Raise");
    socket.emit('CTOS-RAISE');
    const raiseBtn = document.getElementById('raise-btn')
    raiseBtn.disabled = true;
  }  
  
  socket.on('STOC-SHOW-RAISED-CARDS', (poppedElements, poppedSuits) => {
    console.log("openedcards:", poppedElements);
    // Get a reference to the OpenedCards div
    //var openedCardsDiv = document.querySelector('.OpenedCards');
    const playedContainer = document.getElementById('container_played');
    poppedElements.forEach((element, index) => {
      playedContainer.removeChild(playedContainer.lastChild);
    });
    // Create a new element for each popped element 
    var items = "";
    poppedElements.forEach((element, index) => {
      var cardElement = document.createElement('div');
      cardElement.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      cardElement.textContent = poppedSuits[index] + element;;
      items = items+" "+poppedSuits[index] + element;
      cardElement.setAttribute('tabindex', '1');
      cardElement.setAttribute('role', 'button');
      cardElement.setAttribute('title', 'on raised');
      cardElement.style.backgroundColor = "#ff0000";
      playedContainer.appendChild(cardElement);
    });
    notifyScreenReader("Raiced cards : "+items, "assertive");
  });

  socket.on('STOC1C-DUMP-PENALTY-CARDS', (CardStack, poppedElements, SuitStack, poppedSuits) => {
    var suitsBack = [];
    var cardsGivingBack = [];
    while (poppedElements.length > 0) {
      cardsGivingBack.push(poppedElements.pop());
      suitsBack.push(poppedSuits.pop());
    }
    // Push values from stack2 to the combinedStack
    while (CardStack.length > 0) {
      cardsGivingBack.push(CardStack.pop());
      suitsBack.push(SuitStack.pop());
    }

    var items = "";
    console.log("cards for faileduser:", cardsGivingBack);
    console.log("suits for faileduser:", suitsBack);
    const cardContainer = document.getElementById('card-container');
    cardsGivingBack.forEach((cardvalue, index) => {
      const newCard = document.createElement('div');
      newCard.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      newCard.id = suitsBack[index] + cardvalue;
      newCard.setAttribute('tabindex', '1');
      newCard.setAttribute('role', 'button');
      newCard.setAttribute('title', 'on deck');
      newCard.textContent = suitsBack[index] + cardvalue;
      items = items+" "+suitsBack[index] + cardvalue;
      newCard.style.backgroundColor = "#ff0000";
 
      // Append the card to the card container;
      cardContainer.appendChild(newCard);
    });
    console.log("Number of cards in the container:", cardContainer.childElementCount);
    containerCount = cardContainer.childElementCount;
    listenNodeInserted = false;
    sort_cards('card-container');
    listenNodeInserted = true;

    notifyScreenReader("Recived penalty cards : "+items, "assertive");
  })

  function passaction(){
    socket.emit('CTOS-PASS',pos);
  }

  socket.on('STOC-PLAY-OVER',()=>{
    console.log("this play over .");
    const playedContainer = document.getElementById('container_played');
    playedContainer.innerHTML = "";
  });
  
  socket.on('STOC-PLAYER-WON', (player_position) => {
    console.log("Player winned ", player_position);
    var player = document.getElementById(`user${player_position}`)
    player.style.backgroundColor = "#97FF00";
    if(pos === player_position){
      alert("Won!");
    }
    else{
      notifyScreenReader("Player winned : "+player_position, "assertive");
    }
  });

  socket.on('STOC-GAME-OVER',(wonUsers)=>{
  console.log("GAME OVER ");
  console.log("THE WINNERS ARE:",wonUsers);
  });


  socket.on('disconnect', () => {
    // Handle the disconnection
    console.log('Disconnected from the server.');
  });
