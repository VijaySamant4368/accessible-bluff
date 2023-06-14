
module.exports = {
  partitionCards: (cardset, roomCapacity) => {
    const totalCards = cardset.length;
    const cardsPerPlayer = Math.floor(totalCards / roomCapacity);
    console.log(cardsPerPlayer)
    const partitionedCards = [];
    for (let i = 0; i < roomCapacity; i++) {
      const start = i * cardsPerPlayer;
      const end = (i + 1) * cardsPerPlayer;
      partitionedCards.push(cardset.slice(start, end));
    }
    return partitionedCards;
  },
  // Function to be executed after 2 seconds
  delayedCode: (cardset, roomCapacity, connectedClients) => {
    // Code to be executed after 2 seconds
    const partitionedCards = module.exports.partitionCards(cardset, roomCapacity);
    // Iterate over the client array and assign subpartitions to each client
    connectedClients.forEach((client, index) => {
      const subpartition = partitionedCards[index]; // Get the corresponding subpartition
      console.log(subpartition);
      // Emit the subpartition to the client
      client.emit('subpartition', subpartition);
    });
  },

}