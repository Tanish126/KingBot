const mineflayer = require("mineflayer");
const readline = require("readline");
const fs = require("fs");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");

// Function to detect quoted text
function detectQuotes(text) {
    const quotePattern = /"([^"]*)"/g;
    return text.match(quotePattern) || [];
}

// Function to detect fill-in-the-blank patterns
function detectFillInTheBlanks(text) {
    const blankPattern = /"___\w+"/g;
    return text.match(blankPattern) || [];
}

// Function to log detected messages into FutureSolver.js
function logToFile(data) {
    fs.appendFile("FutureSolver.js", data + "\n", (err) => {
        if (err) console.error("Error writing to file:", err);
    });
}

// Bot creation function
function createBot() {
    const bot = mineflayer.createBot({
        host: "play.stealfun.net",
        version: false,
        username: "MarblePhantom69",
        port: 25565,
        plugins: [AutoAuth],
        AutoAuth: {
            password: "843271", // Set the password here
        },
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    let botReady = false;

    bot.on("spawn", () => {
        console.log("Bot has spawned and is connected to the server!");
        botReady = true;

        setTimeout(() => {
            // Interact with the compass after spawning
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                console.log("Compass found! Opening it...");
                bot.activateItem(); // Simulates right-clicking the compass to open the GUI
            } else {
                console.log("Compass not found in inventory.");
            }
        }, 3000); // Wait 3 seconds to ensure bot is fully spawned
    });

    bot.on("windowOpen", (window) => {
        console.log("GUI opened!");

        // Check all slots in the GUI
        window.slots.forEach((item, index) => {
            if (item) {
                console.log(`Slot ${index}: ${item.displayName}`);
            }
        });

        // Find the slot with "Lifesteal Realm"
        const lifestealSlot = window.slots.findIndex(
            (item) => item && item.displayName.includes("Purple Dye")
        );
        if (lifestealSlot !== -1) {
            console.log(`Lifesteal Realm found in slot ${lifestealSlot}`);
            bot.clickWindow(lifestealSlot, 0, 0); // Click on the "Lifesteal Realm" slot
        } else {
            console.log("Lifesteal Realm not found in any slot!");
        }
    });

    // Detect and log messages (chat, system, server)
    bot.on("message", async (jsonMsg) => {
        const msg = jsonMsg.toString();
        console.log("Message received:", msg);
        logToFile(msg); // Save every message to FutureSolver.js

        // Detect quotes and fill-in-the-blanks
        const quotes = detectQuotes(msg);
        const blanks = detectFillInTheBlanks(msg);

        if (quotes.length > 0) {
            console.log("Detected Quotes:", quotes);
            logToFile("Detected Quotes: " + quotes.join(", "));
        }
        if (blanks.length > 0) {
            console.log("Detected Fill-in-the-blanks:", blanks);
            logToFile("Detected Fill-in-the-blanks: " + blanks.join(", "));
        }
    });

    bot.on("kicked", console.log);
    bot.on("error", console.log);
    bot.on("end", () => {
        console.log("Bot disconnected. Restarting...");
        createBot(); // Restart the bot if it disconnects
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.on("line", (input) => {
        if (input.trim()) {
            console.log(`Attempting to send message: ${input}`);
            if (botReady) {
                try {
                    bot.chat(input);
                    console.log(`Sent: ${input}`);
                } catch (error) {
                    console.log("Error sending message: ", error);
                }
            } else {
                console.log("Bot not connected yet.");
            }
        }
    });
}

// Start the bot
createBot();
