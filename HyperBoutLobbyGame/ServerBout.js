/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/
var util = require("util"),                                 // Utility resources (logging, object inspection, etc)
    io = require("socket.io"),                              // Socket.IO
    HyperPlayer = require("./ServerPlayer").HyperPlayer;    // HyperPlayer class


/**************************************************
** GAME VARIABLES
**************************************************/
var socket,         // Socket controller
    players,        // Array of connected players
    usernameArray,  // Array of usernames in lobby
    chatHistory,    // Stores chat history for late users
    readyArray;     // Array to store ready state in lobby

/**************************************************
** GAME INITIALISATION
**************************************************/
function init() {
    
    // Create an empty array to store players
    players = [];
    usernameArray = [];    
    readyArray = [];

    // Set up Socket.IO to listen on port 8000
    socket = io.listen(8000);

    // Configure Socket.IO
    socket.configure(function() {
        // Only use WebSockets
        socket.set("transports", ["websocket"]);

        // Restrict log output
        socket.set("log level", 2);
    });

    // Start listening for events
    setEventHandlers();
};


/**************************************************
** GAME EVENT HANDLERS
**************************************************/
var setEventHandlers = function() {
    // Socket.IO
    socket.sockets.on("connection", onSocketConnection);
};

// New socket connection
function onSocketConnection(client) {  
    util.log("New player has connected: "+client.id);
    
    // Listen for client disconnected
    client.on("disconnect", onClientDisconnect);

    // Listen for new player message
    client.on("new player", onNewPlayer);

    // Listen for move player message
    client.on("move player", onMovePlayer);

    //Listen for when a player inputs his/her name
    client.on("on username input", onUsername);

    //Listen when player submits something to chat
    client.on("recieve chat", onMessage);

    //Update new player on existing chat history
    client.on("request chat", onChatRequest);

    //Update players on who is ready
    client.on("recieve ready", onReady);
};


/**************************************************
** LOBBY EVENTS
**************************************************/
function onUsername(data) {
    util.log("New Player: " + data.username);
    usernameArray.push(data.username);
    this.emit("username update", {usernames: usernameArray});
    this.broadcast.emit("username update", {usernames: usernameArray});
}

function onMessage(data) {
    util.log("Recieved Chat Message: " + data.chatSession);
    chatHistory = data.chatSession;
    this.emit("update chat", {chatSession: data.chatSession});
    this.broadcast.emit("update chat", {chatSession: data.chatSession});
}

function onChatRequest()
{
    util.log("Updating player's chat history");
    this.emit("update chat", {chatSession: chatHistory});
}

function onReady(data)
{
    util.log(data.username + " : Has readied up");
    var index = usernameArray.indexOf(data.username);
    readyArray[index] = true;
    this.emit("ready update", {readyArray: readyArray});
    this.broadcast.emit("ready update", {readyArray: readyArray});
}

/**************************************************
** GAME/CONFIGURATION EVENTS
**************************************************/
// Socket client has disconnected
function onClientDisconnect() {
    util.log("Player has disconnected: "+this.id);

    var removePlayer = playerById(this.id);

    // Player not found
    if (!removePlayer) {
        util.log("Player not found: "+this.id);
        return;
    };

    // Remove player from players array
    players.splice(players.indexOf(removePlayer), 1);

    // Broadcast removed player to connected socket clients
    this.broadcast.emit("remove player", {id: this.id});
};

// New player has joined
function onNewPlayer(data) {
    // Create a new player
    var newPlayer = new HyperPlayer();
    newPlayer.id = this.id;
    newPlayer.playerNumber = players.length + 1;
    util.log("YAY " + players.length);
    this.emit("update id", {id: newPlayer.id, playerNumber: newPlayer.playerNumber});

    // Broadcast new player to connected socket clients
    this.broadcast.emit("new player", {id: newPlayer.id, playerNumber: newPlayer.playerNumber, x: newPlayer.getX(), y: newPlayer.getY()});

    // Send existing players to the new player
    var i, existingPlayer;
    for (i = 0; i < players.length; i++) {
        existingPlayer = players[i];
        this.emit("new player", {id: existingPlayer.id, playerNumber: existingPlayer.playerNumber, x: existingPlayer.getX(), y: existingPlayer.getY()});
    };   
    // Add new player to the players array
    players.push(newPlayer);
};

// Player has moved
function onMovePlayer(data) {
    // Find player in array
    var movePlayer = playerById(this.id);

    // Player not found
    if (!movePlayer) {
        util.log("Player not found: "+this.id);
        return;
    };
    // util.log(data.x);
    // util.log(data.y);
    // Update player position
    //movePlayer.setX(data.x);
    //movePlayer.setY(data.y);

    // Broadcast updated position to connected socket clients
    data.id = this.id;
    this.broadcast.emit("move player", data);
};

/**************************************************
** GAME HELPER FUNCTIONS
**************************************************/
// Find player by ID
function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id == id)
            return players[i];
    };
    
    return false;
};


/**************************************************
** RUN THE GAME
**************************************************/
init();