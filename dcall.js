const { Client, GatewayIntentBits } = require("discord.js");
const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");

// Discord Bot Configuration
const DISCORD_TOKEN = "NzUwOTQwNDEwMzQ3NzgyMTQ0.GETkJZ.DT6b5VLqW4Wk07UqitdinoFsxL_ZIoefW_D5Rg"; // 🔴 Replace with your token
const DISCORD_CHANNEL_ID = "1320095408390934595"; // 🔴 Replace with your channel ID

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

// Setup Discord bot
const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

discordClient.once("ready", () => {
    console.log(`✅ Discord bot logged in as ${discordClient.user.tag}`);
});

// Function to send logs to Discord
function sendToDiscord(message) {
    const channel = discordClient.channels.cache.get(DISCORD_CHANNEL_ID);
    if (channel) {
        channel.send(message).catch(console.error);
    } else {
        console.error("❌ Failed to send message to Discord: Channel not found.");
    }
}

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
    sendToDiscord(logEntry.trim());
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

// Function to solve algebraic equations
function solveEquation(equations) {
    let values = {};
    let unknownEquation = null;
    let unknownSymbol = null;

    equations.forEach((eq) => {
        let parts = eq.split(" = ");
        let result = parseInt(parts[1]);
        let symbols = parts[0].split(" + ");

        if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
            values[symbols[0]] = result / 3;
        } else {
            let unknowns = symbols.filter(s => !(s in values));
            if (unknowns.length === 1) {
                unknownEquation = symbols;
                unknownSymbol = unknowns[0];
            }
        }
    });

    if (unknownEquation && unknownSymbol) {
        let knownSum = unknownEquation
            .filter(s => s in values)
            .reduce((sum, s) => sum + values[s], 0);
        let result = parseInt(equations.find(eq => eq.includes(unknownSymbol)).split(" = ")[1]);
        values[unknownSymbol] = result - knownSum;
        return values[unknownSymbol];
    }

    return null;
}

// Function to detect chat games
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
        setTimeout(() => {
            bot.chat(targetText);
            logMessage(`🟢 Typed: ${targetText}`, CHATGAME_LOG);
        }, 1500);
    }
}

// Function to move bot randomly to avoid AFK
function moveBot(bot) {
    if (isMoving) return;
    isMoving = true;

    setInterval(() => {
        if (!bot.entity || !bot.entity.position) return;

        const x = bot.entity.position.x + (Math.random() * 2 - 1);
        const z = bot.entity.position.z + (Math.random() * 2 - 1);
        const y = bot.entity.position.y;

        bot.pathfinder.setGoal(new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
        logMessage(`🚶 Moving bot to X:${x.toFixed(2)}, Y:${y.toFixed(2)}, Z:${z.toFixed(2)}`, MOVEMENT_LOG);
    }, 30000);
}

// Create bot function
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
        moveBot(bot);
    });

    bot.on("message", (jsonMsg) => {
        const msg = jsonMsg.toString();
        logMessage(msg);
        detectAndRespondToChatGame(bot, msg);
    });

    bot.on("kicked", (reason) => logMessage(`🚫 Bot was kicked: ${reason}`));
    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
    bot.on("end", () => {
        logMessage("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    // Handle Discord messages to send commands to the bot
    discordClient.on("messageCreate", (message) => {
        if (message.author.bot || !message.content.startsWith("!bot ")) return;
        const command = message.content.slice(5).trim();
        logMessage(`💬 Discord Command: ${command}`);
        bot.chat(command);
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.trim()) {
            logMessage(`💬 Sending message: ${input}`);
            bot.chat(input);
        }
    });
}

// Start Discord & Minecraft bot
discordClient.login(DISCORD_TOKEN).catch(console.error);
createBot();
