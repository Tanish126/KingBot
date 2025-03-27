const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");
const { GoalBlock } = require("mineflayer-pathfinder").goals;

// Log files
const LOG_FILE = "chat_logs.txt";
const CHATGAME_LOG = "chatgames_log.txt";
const MOVEMENT_LOG = "movement_log.txt";
const QUOTED_LOG = "quoted_messages_log.txt";
const UNDERSCORE_LOG = "underscore_messages_log.txt";

let lastChatGameTime = 0;
let lastSentAnswer = null;
let pendingEquations = [];
let solvingEquation = false;
let correctAnswer = null;

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

// Function to move bot randomly after 30 seconds
function moveBotOnce(bot) {
    setTimeout(() => {
        if (!bot.entity || !bot.entity.position) {
            logMessage("Bot entity missing, cannot move.", MOVEMENT_LOG);
            return;
        }

        const directions = [
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: -1 }
        ];

        let moveSuccess = false;
        for (let i = 0; i < directions.length; i++) {
            const randomDir = directions[Math.floor(Math.random() * directions.length)];
            const targetPos = bot.entity.position.offset(randomDir.x, randomDir.y, randomDir.z);
            const belowBlock = bot.blockAt(targetPos.offset(0, -1, 0));
            const blockAtTarget = bot.blockAt(targetPos);

            if (blockAtTarget?.boundingBox === "empty" && belowBlock?.boundingBox !== "empty") {
                logMessage(`🚶 Moving bot to X:${targetPos.x}, Y:${targetPos.y}, Z:${targetPos.z}`, MOVEMENT_LOG);
                bot.pathfinder.setGoal(new GoalBlock(targetPos.x, targetPos.y, targetPos.z));
                moveSuccess = true;
                break;
            }
        }

        if (!moveSuccess) {
            logMessage("❌ No valid movement path found, cancelling movement.", MOVEMENT_LOG);
        }
    }, 30000);
}

// Bot creation function
function createBot() {
    const bot = mineflayer.createBot({
        host: "play.potionmc.xyz",
        version: false,
        username: "EnderEcho99",
        port: 25565,
        plugins: [AutoAuth],
        AutoAuth: { password: "843271" },
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    bot.on("spawn", () => {
        logMessage("✅ Bot has spawned and is connected!");
        moveBotOnce(bot);
      
        setTimeout(() => {
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                logMessage("🧭 Compass found! Opening it...");
                bot.activateItem();
            } else {
                logMessage("Compass not found.");
            }
        }, 3000);
    });

    bot.on("windowOpen", (window) => {
        logMessage("🎮 GUI opened!");

        function findAndClickLifesteal() {
            const lifestealSlot = window.slots.findIndex(
                (item) => item && item.displayName.includes("Purple Dye")
            );

            if (lifestealSlot !== -1) {
                logMessage(`🌟 Lifesteal Realm found in slot ${lifestealSlot}. Clicking...`);
                bot.clickWindow(lifestealSlot, 0, 0);
            } else {
                logMessage("Lifesteal Realm not found! Retrying in 2 seconds...");
                setTimeout(findAndClickLifesteal, 2000);
            }
        }

        findAndClickLifesteal();
    });

    bot.on("message", async (jsonMsg) => {
        const msg = jsonMsg.toString();
        logMessage(msg);

        // Log messages inside quotes
        const quoteMatch = msg.match(/"([^"]+)"/);
        if (quoteMatch) {
            logMessage(`🔹 Quoted Message: ${quoteMatch[1]}`, QUOTED_LOG);
        }

        // Log messages containing underscores
        if (msg.includes("_")) {
            logMessage(`🔸 Underscored Message: ${msg}`, UNDERSCORE_LOG);
        }
       
       // Log full message if it contains "ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ꜰɪʟʟ ᴛʜᴇ ʙʟᴀɴᴋѕ"
    if (msg.includes("ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ꜰɪʟʟ ᴛʜᴇ ʙʟᴀɴᴋѕ")) {
        logMessage(`📝 Fill-in-the-blanks message: ${msg}`, CHATGAME_LOG);
    }

        // Detect the correct answer from the server
        if (msg.includes("ᴛʜᴇ ᴄᴏʀʀᴇᴄᴛ ᴀɴѕᴡᴇʀ ᴡᴀs")) {
            const correctAnswerMatch = msg.match(/"([^"]+)"/);
            if (correctAnswerMatch) {
                correctAnswer = correctAnswerMatch[1];
                logMessage(`🎯 Correct Answer Logged: ${correctAnswer}`, CHATGAME_LOG);
            }
        }

        // Log if any message contains the correct answer
        if (correctAnswer && msg.toLowerCase().includes(correctAnswer.toLowerCase())) {
            logMessage(`✅ Message contains the correct answer: ${correctAnswer}`, CHATGAME_LOG);
        }
    });

    bot.on("kicked", (reason) => logMessage(`🚫 Bot was kicked: ${reason}`));
    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
    bot.on("end", () => {
        logMessage("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.trim()) {
            logMessage(`💬 Sending message: ${input}`);
            bot.chat(input);
        }
    });
}

createBot();
;
