const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");

// Load chat game dictionary
const chatGameWords = require("./chatgame_words.json");

// Log files
const LOG_FILE = "chat_logs.txt";
const CHATGAME_LOG = "chatgames_log.txt";
const MOVEMENT_LOG = "movement_log.txt";

let lastChatGameTime = 0;
let lastSentAnswer = null;
let pendingEquations = [];
let solvingEquation = false;
let isMoving = false;
let cooldownActive = false;

// Function to log messages with date & time
function logMessage(message, file = LOG_FILE) {
    const now = new Date();
    const istTime = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    }).format(now);
    const timestamp = `[${istTime} IST]`;
    const logEntry = `${timestamp} ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(file, logEntry);
}

// Function to detect and respond to chat games
function detectAndRespondToChatGame(bot, message) {
    const typeRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴛʏᴘᴇ "(.*?)"/i;
    const unscrambleRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴜɴѕᴄʀᴀᴍʙʟᴇ "(.*?)"/i;

    let match = message.match(typeRegex) || message.match(unscrambleRegex);
    if (match) {
        let targetText = match[1];

        if (message.includes("ᴜɴѕᴄʀᴀᴍʙʟᴇ")) {
            // Check if there's a correct word in the dictionary
            let correctWord = chatGameWords.find(word => word.split("").sort().join("") === targetText.split("").sort().join(""));
            
            if (correctWord) {
                targetText = correctWord;
            } else {
                logMessage(`⚠️ No match found for unscramble: ${targetText}`, CHATGAME_LOG);
                return;
            }
        }

        logMessage(`📢 Detected Chat Game! Target text: ${targetText}`, CHATGAME_LOG);

        // Random delay between 1500ms and 2300ms
        const delay = Math.floor(Math.random() * (2300 - 1500 + 1)) + 1500;
        setTimeout(() => {
            bot.chat(targetText);
            logMessage(`🟢 Typed: ${targetText} (after ${delay}ms)`, CHATGAME_LOG);
        }, delay);
    }
}

// Bot creation function
function createBot() {
    const bot = mineflayer.createBot({
        host: "play.stealfun.net",
        port: 25565,
        username: "ShadowCrafterX",
        plugins: [AutoAuth],
        AutoAuth: { password: "843271" },
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    bot.on("spawn", () => {
        logMessage("✅ Bot has spawned!");

        setTimeout(() => {
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                logMessage("🧭 Compass found! Opening it...");
                bot.activateItem();
            } else {
                logMessage("⚠️ Compass not found.");
            }
        }, 3000);
    });

    bot.on("windowOpen", (window) => {
        logMessage("🎮 GUI opened!");
        const lifestealSlot = window.slots.findIndex(
            (item) => item && item.displayName.includes("Purple Dye")
        );
        if (lifestealSlot !== -1) {
            logMessage(`🌟 Lifesteal Realm found in slot ${lifestealSlot}`);
            bot.clickWindow(lifestealSlot, 0, 0);
        } else {
            logMessage("Lifesteal Realm not found!");
        }
    });

    bot.on("message", async (jsonMsg) => {
        const msg = jsonMsg.toString();
        logMessage(msg);

        detectAndRespondToChatGame(bot, msg);

        if (msg.includes("ᴛʜᴇ ᴄᴏʀʀᴇᴄᴛ ᴀɴsᴡᴇʀ ᴡᴀѕ")) {
            const correctAnswerMatch = msg.match(/"([^"]+)"/);
            if (correctAnswerMatch) {
                const correctAnswer = correctAnswerMatch[1];
                if (lastSentAnswer === correctAnswer) {
                    logMessage(`🎉 Chat Game Won! Correct Answer: ${correctAnswer}`, CHATGAME_LOG);
                } else {
                    logMessage(`❌ Chat Game Lost. Correct Answer: ${correctAnswer}, Bot's Answer: ${lastSentAnswer}`, CHATGAME_LOG);
                }
            }
            lastSentAnswer = null;
        }
    });

    bot.on("kicked", (reason) => logMessage(`🚫 Bot was kicked: ${reason}`));
    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
    bot.on("end", () => {
        logMessage("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    // Readline for manual chat input
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.trim()) {
            logMessage(`💬 Sending message: ${input}`);
            bot.chat(input);
        }
    });
}

createBot();
