// ==========================
// 🚀 1. STANDARD POINTERS
// ==========================

// Importing libraries
const server = require('http').createServer();
const io = require('socket.io')(server, { cors: { origin: '*' } });
// Port for server startup
const port = 3003;

// ==========================
// 🎯 2. PLAYER MODELS
// ==========================

// Array of players
let players = [];
//let playerCount = 0; // Tracking the number of players

// Player model
class Player {
    constructor(data) {
        this.socket = data.socket;
        this.username = data.username || "Guest"; // Player name
        this.turnOrder = data.turnOrder || null; // Player turn order
    }

    get id() {
        return this.socket.id;
    }

    toString() {
        return JSON.stringify({ 
            id: String(this.id), 
            username: this.username,
            turnOrder: this.turnOrder
        }, this.replacer);
    }

    replacer(key, value) {
        if (key == "socket") return undefined;
        return value;
    }
}

// ==========================
// 🌐 3. METHODS REQUIRED FOR SERVER FUNCTIONALITY
// ==========================

// Socket initialization
io.on('connection', (client) => {
    console.log("New client connected: " + client.id);

    let player;

    // Adding a new player
    client.on('create_player', (data) => {
        console.log("Received create_player data:", data);

        try {
            data = JSON.parse(data);  // Parse incoming data

            // Validate the data to ensure all necessary fields are present
            if (!data.username || !data.turnOrder) {
                throw new Error("Missing player data: username or turnOrder");
            }

            // Create the player object
            player = new Player({
                socket: client,
                username: data.username,
                turnOrder: players.length // Assign turn order based on index in the list
            });

            // Check if the player already exists (duplicate ID check)
            if (players.some(p => p.id === player.id)) {
                console.log("Player already exists with ID:", player.id);
                return;
            }

            players.push(player);
            playerCount = players.length;

            // Update turnOrder for each player
            players.forEach((p, index) => {
                p.turnOrder = index;
            });

            // Send player creation data to the new player
            client.emit('create_player', JSON.stringify({
                player: player.toString(),
                playerCount: playerCount.toString()
            }));

            // Broadcast new player creation to other players
            client.broadcast.emit('create_player_other', JSON.stringify({
                player: player.toString(),
                playerCount: playerCount.toString()
            }));

            // Send the existing players data to the new player (excluding the new player)
            players.forEach((p) => {
                if (p !== player) {
                    client.emit('create_player_other', p.toString());
                }
            });

            console.log(`Player "${player.username}" (ID: ${player.id}) created!`);

        } catch (err) {
            console.error("Error parsing create_player data:", err);
            client.emit('create_player_error', `Error creating player: ${err.message}`);
        }
    });

    // Method to update the current player's turn
    client.on('change_turn', (data) => {
        console.log("Received change_turn data:", data);

        try {
            data = JSON.parse(data); // Parse incoming data

            if (data.playerTurn === undefined) {
                throw new Error("Missing playerTurn data");
            }

            // Update the global playerTurn
            global.playerTurn = data.playerTurn;

            // Notify all players about the updated turn
            client.broadcast.emit('change_turn', JSON.stringify({
                playerTurn: global.playerTurn
            }));

            console.log("Player turn updated:", global.playerTurn);

        } catch (err) {
            console.error("Error updating player turn:", err);
            client.emit('change_turn_error', `Error updating player turn: ${err.message}`);
        }
    });

    // Method to update the current player's direction
    client.on('change_dir', (data) => {
        console.log("Received change_dir data:", data);

        try {
            data = JSON.parse(data); // Parse incoming data

            if (data.playerDirection === undefined) {
                throw new Error("Missing playerDirection data");
            }

            // Update the global playerDirection
            global.playerDirection = data.playerDirection;

            // Notify all players about the updated direction
            client.broadcast.emit('change_dir', JSON.stringify({
                playerDirection: global.playerDirection
            }));

            console.log("Player direction updated:", global.playerDirection);

        } catch (err) {
            console.error("Error updating player direction:", err);
            client.emit('change_dir_error', `Error updating player direction: ${err.message}`);
        }
    });

    // Method to update the current player's kick force
    client.on('change_kick_force', (data) => {
        console.log("Received change_kick_force data:", data);

        try {
            data = JSON.parse(data); // Parse incoming data

            if (data.kickForce === undefined) {
                throw new Error("Missing kickForce data");
            }

            // Update the global kickForce
            global.kickForce = data.kickForce;

            // Notify all players about the updated kick force
            client.broadcast.emit('change_kick_force', JSON.stringify({
                kickForce: global.kickForce
            }));

            console.log("Player kick force updated:", global.kickForce);

        } catch (err) {
            console.error("Error updating player kick force:", err);
            client.emit('change_kick_force_error', `Error updating player kick force: ${err.message}`);
        }
    });

    // Method to send the list of players to the client
    client.on('get_players_list', () => {
        console.log("Sending players list to the client...");

        const playersList = players.map((player, index) => {
            return {
                id: player.id,
                turnOrder: player.turnOrder
            };
        });

        client.emit('players_list', JSON.stringify({
            players: playersList,
            playerCount: players.length.toString()
        }));

        console.log("Players list sent:", playersList);
    });

    // Handling player disconnection
    client.on('disconnect', () => {
        if(player != null) {
            if (players.includes(player)) {
                players.splice(players.indexOf(player), 1);
            }

            playerCount = players.length;

            // Update turnOrder for remaining players
            players.forEach((p, index) => {
                p.turnOrder = index;
            });

            // Notify other players about the player disconnecting
            client.broadcast.emit('destroy_player', JSON.stringify({ 
                player: player.toString(), 
                playerCount: playerCount.toString()
            }));

            console.log(`Player "${player.username}" (ID: ${player.id}) disconnected.`);
        }
    });
});

// ==========================
// ⚙️ 4. SYSTEM METHODS THAT DO NOT AFFECT SERVER FUNCTIONALITY
// ==========================

// Handling errors when starting the server
server.listen(port, (err) => {
    if (err) {
        console.error("Error starting the server:", err);
        process.exit(1);
    }
    console.log(`Listening on port ${port}`);
    console.log("Server started (Ctrl+C to exit)");
});

// Handling uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
});