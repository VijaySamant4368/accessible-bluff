  var pos;
  var next;
  var selectedCards = [];

  var socket = io();

  const passButton = document.getElementById('pass-btn');

document.addEventListener('keydown', (event) => {
  // Check if the pressed key is either "P" or "p" (case-insensitive)
  if (event.key.toLowerCase() === 'p') {
    passButton.click(); // Trigger pass button click event
  }
});

const raiseButton = document.getElementById('raise-btn');

document.addEventListener('keydown', (event) => {
  // Check if the pressed key is either "R" or "r" (case-insensitive)
  if (event.key.toLowerCase() === 'r') {
    raiseButton.click(); // Trigger raise button click event
  }
});

  socket.on('STOC-SET-NUMBER-OF-PLAYERS', (total) => {
    const playerContainer = document.getElementById('player-container')
    for (i = 1; i <= total; i++) {
      playerContainer.innerHTML += `<div class="user p-1"><i class="far fa-user"></i><span id="user${i}">user${i}</span></div>`
    }
  })

  socket.on('STO1C-SET-POSITION', (index) => {
    pos = index;
    var player = document.getElementById(`user${pos}`)
    player.innerHTML = ''
    player.innerText = 'You'
    console.log("playorder:", index);
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
    startShufflingEffect();
  });

  const toSelected = (card, newCard, cardContainer) => {
    selectedCards.push(card);
    cardContainer.removeChild(newCard);
    newCard.className = 'col-6 col-sm-4 col-lg-2 offset-lg-0 cards'
    const selectionContainer = document.getElementById('container_placing');
    selectionContainer.appendChild(newCard);
    newCard.addEventListener('click', () => {
      selectedCards.splice(selectedCards.indexOf(card), 1);
      console.log(selectedCards);
      selectionContainer.removeChild(newCard);
      newCard.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      cardContainer.appendChild(newCard);
      newCard.addEventListener('click', () => {
        toSelected(card, newCard, cardContainer);

      }, { once: true })
    }, { once: true });
  }

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
      newCard.setAttribute('tabindex', '0');
      newCard.textContent = card.suit + card.value;
      newCard.addEventListener('click', () => {
        toSelected(card, newCard, cardContainer);
      }, { once: true });
      // Append the card to the card container;
      cardContainer.appendChild(newCard);
    });
    sort_cards('card-container');
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

    }
    else {
      const placeBtn = document.getElementById('place-btn')
      placeBtn.disabled = true;
      const passBtn = document.getElementById('pass-btn')
      passBtn.disabled = true;
    }
  });

  const placeCards = () => {
    var cardContainer = document.getElementById('card-container');
    var cards_remaining = cardContainer.childElementCount;
    var input = document.getElementById('input');
    var bluff_text = input.value
    input.value = ''
    socket.emit('CTOS-PLACE-CARD', selectedCards, bluff_text, cards_remaining);
    selectedCards = [];
    const selectionContainer = document.getElementById('container_placing');
    selectionContainer.innerHTML = '';    
    const placeBtn = document.getElementById('place-btn')
    placeBtn.disabled = true;
  }

  socket.on('STOC-RAISE-TIME-START', () => {
    console.log("raise time starts");
    if (pos != next) {
      const raiseBtn = document.getElementById('raise-btn')
      raiseBtn.disabled = false;
    }
  });

  socket.on('STOC-RAISE-TIME-OVER', () => {
    console.log("raise time over")
    const raiseBtn = document.getElementById('raise-btn')
    raiseBtn.disabled = true;
  });

  socket.on('STOC-GAME-PLAYED', (CardCount, bluffText) => {
    console.log("STOC-GAME-PLAYED:", CardCount, bluffText)
    const playingContainer = document.getElementById('container_played');
    for (var i = 1; i <= CardCount; i++) {
      // Create a new card element
      const newCard = document.createElement('div');
      newCard.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      newCard.id = bluffText;
      newCard.setAttribute('tabindex', '0');
      newCard.textContent = bluffText;
      // Append the card to the card container;
      playingContainer.appendChild(newCard);
    }
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
    poppedElements.forEach((element, index) => {
      var cardElement = document.createElement('div');
      cardElement.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      cardElement.textContent = poppedSuits[index] + element;;
      playedContainer.appendChild(cardElement);
    });
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
    console.log("cards for faileduser:", cardsGivingBack);
    console.log("suits for faileduser:", suitsBack);
    const cardContainer = document.getElementById('card-container');
    cardsGivingBack.forEach((cardvalue, index) => {
      const newCard = document.createElement('div');
      newCard.className = 'col-4 col-sm-2 col-lg-1 offset-lg-0 cards ';
      newCard.id = suitsBack[index] + cardvalue;
      newCard.setAttribute('tabindex', '0');
      newCard.textContent = suitsBack[index] + cardvalue;
      newCard.style.backgroundColor = "#ff0000";
      const cardObject = {
        suit: suitsBack[index],
        value: cardvalue
      };
      newCard.addEventListener('click', () => {
        toSelected(cardObject, newCard, cardContainer);
      }, { once: true });
      // Append the card to the card container;
      cardContainer.appendChild(newCard);
    });
    console.log("Number of cards in the container:", cardContainer.childElementCount);
    containerCount = cardContainer.childElementCount;
    sort_cards('card-container');
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
  });

  socket.on('disconnect', () => {
    // Handle the disconnection
    console.log('Disconnected from the server.');
  });