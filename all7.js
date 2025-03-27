const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");

// Log files
const LOG_FILE = "chat_logs.txt";
const CHATGAME_LOG = "chatgames_log.txt";
const MOVEMENT_LOG = "movement_log.txt";

let lastChatGameTime = 0;
let lastSentAnswer = null;
let pendingEquations = [];
let solvingEquation = false;
let cooldownActive = false;

// Function to log messages
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

// Function to solve simple math problems
function solveMathProblem(question) {
    try {
        let formatted = question.replace(/[^0-9+\-*/().]/g, "");
        if (/^[0-9+\-*/(). ]+$/.test(formatted)) {
            return eval(formatted).toString();
        }
    } catch (error) {
        logMessage("❌ Math Solver Error: " + error.message);
    }
    return null;
}

// Function to move bot randomly on command
function moveBot(bot) {
    if (!bot || !bot.entity) {
        logMessage("⚠️ Bot is not initialized. Cannot move.", MOVEMENT_LOG);
        return;
    }
    if (!bot.entity.onGround) {
        logMessage("⚠️ Bot is not on the ground. Movement canceled.", MOVEMENT_LOG);
        return;
    }

    let dx = Math.random() * 4 - 2;
    let dz = Math.random() * 4 - 2;
    let x = bot.entity.position.x + dx;
    let z = bot.entity.position.z + dz;
    let y = bot.entity.position.y;

    bot.pathfinder.setGoal(new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
    logMessage(`🚶 Moving bot to X:${x.toFixed(2)}, Y:${y.toFixed(2)}, Z:${z.toFixed(2)}`, MOVEMENT_LOG);
}

// Function to detect and respond to chat games
function detectAndRespondToChatGame(bot, message) {
    const typeRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴛʏᴘᴇ "(.*?)"/i;
    const unreverseRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴜɴʀᴇᴠᴇʀѕᴇ "(.*?)"/i;

    let match = message.match(typeRegex) || message.match(unreverseRegex);
    if (match) {
        let targetText = match[1];

        if (message.includes("ᴜɴʀᴇᴠᴇʀѕᴇ")) {
            targetText = targetText.split("").reverse().join(""); 
        }

        logMessage(`📢 Detected Chat Game! Target text: ${targetText}`, CHATGAME_LOG);

        // Random delay between 2000ms and 2500ms
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
        username: "MarblePhantom69",
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
        window.slots.forEach((item, index) => {
            if (item) logMessage(`Slot ${index}: ${item.displayName}`);
        });

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

        const mathProblemMatch = msg.match(/ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ѕᴏʟᴠᴇ "(.*?)"/);
        if (mathProblemMatch) {
            const mathQuestion = mathProblemMatch[1];
            const answer = solveMathProblem(mathQuestion);
            if (answer) {
                lastSentAnswer = answer;
                if (!cooldownActive) {
                    cooldownActive = true;
                    setTimeout(() => {
                        bot.chat(answer);
                        logMessage(`🟢 Sent Math Answer: ${answer}`, CHATGAME_LOG);
                        cooldownActive = false;
                    }, 2000);
                }
            }
        }
    });

    bot.on("kicked", (reason) => logMessage(`🚫 Bot was kicked: ${reason}`));
    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
    bot.on("end", () => {
        logMessage("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    // Readline for console input
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.on("line", (input) => {
        if (input.trim().toLowerCase() === "move") {
            moveBot(bot);
        } else {
            logMessage(`💬 Sending message: ${input}`);
            bot.chat(input);
        }
    });
}

createBot();
