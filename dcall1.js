const { Client, GatewayIntentBits } = require("discord.js");
const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

// 🔴 Configuration
const DISCORD_TOKEN = "NzUwOTQwNDEwMzQ3NzgyMTQ0.GETkJZ.DT6b5VLqW4Wk07UqitdinoFsxL_ZIoefW_D5Rg"; // Replace
const DISCORD_CHANNEL_ID = "1320095408390934595"; // Replace
const ADMIN_USERS = ["616864026088964096"]; // Replace with Discord user ID
const LOG_FILE = "chat_logs.txt";
const MOVEMENT_LOG = "movement_log.txt";

let botData = { health: 0, position: {}, inventory: [] };

// Setup Discord bot
const discordClient = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

discordClient.once("ready", () => {
    console.log(`✅ Discord bot logged in as ${discordClient.user.tag}`);
});

// Setup Web Panel
const app = express();
app.use(cors());
app.use(express.json());

app.get("/bot/status", (req, res) => {
    res.json(botData);
});

app.listen(3000, () => console.log("🌐 Web Panel running at http://localhost:3000"));

// Log function
function logMessage(message, file = LOG_FILE) {
    const now = new Date();
    const timestamp = `[${now.toLocaleTimeString()}]`;
    const logEntry = `${timestamp} ${message}\n`;

    console.log(logEntry.trim());
    fs.appendFileSync(file, logEntry);
}

// Solve chat games
function detectAndRespondToChatGame(bot, message) {
    const typeRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴛʏᴘᴇ "(.*?)"/i;
    const unreverseRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴜɴʀᴇᴠᴇʀѕᴇ "(.*?)"/i;

    let match = message.match(typeRegex) || message.match(unreverseRegex);
    if (match) {
        let targetText = match[1];

        if (message.includes("ᴜɴʀᴇᴠᴇʀѕᴇ")) {
            targetText = targetText.split("").reverse().join("");
        }

        logMessage(`📢 Detected Chat Game! Target text: ${targetText}`);
        setTimeout(() => bot.chat(targetText), 1500);
    }
}

// Random movement to avoid AFK
let isMoving = false;
function moveBot(bot) {
    if (isMoving) return;
    isMoving = true;

    setInterval(() => {
        if (!bot.entity || !bot.entity.position) return;
        const x = bot.entity.position.x + (Math.random() * 2 - 1);
        const z = bot.entity.position.z + (Math.random() * 2 - 1);
        const y = bot.entity.position.y;

        bot.pathfinder.setGoal(new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
        logMessage(`🚶 Moving bot to X:${x.toFixed(2)}, Y:${y.toFixed(2)}, Z:${z.toFixed(2)}`);
    }, 30000);
}

// Create bot function
function createBot() {
    const bot = mineflayer.createBot({
        host: "play.stealfun.net",
        port: 25565,
        username: "ShadowCrafterX",
        plugins: [AutoAuth],
        AutoAuth: { password: "843271" }
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
        setTimeout(createBot, 5000); // Auto-reconnect
    });

    function updateBotData() {
        botData.health = bot.health;
        botData.position = bot.entity.position;
        botData.inventory = bot.inventory.items().map(item => ({ name: item.name, count: item.count }));
    }

    setInterval(updateBotData, 5000);

    // Handle Discord commands
    discordClient.on("messageCreate", async (message) => {
        if (message.author.bot || !message.content.startsWith("!bot ")) return;

        if (!ADMIN_USERS.includes(message.author.id)) {
            message.reply("🚫 You don’t have permission to control the bot.");
            return;
        }

        const command = message.content.slice(5).trim();
        const args = command.split(" ");
        const action = args.shift().toLowerCase();

        if (action === "dropall") {
            bot.inventory.items().forEach((item) => bot.tossStack(item));
            logMessage("🗑 Dropping all items!");
            message.reply("✅ Dropped all items.");
        }

        if (action === "follow" && args.length > 0) {
            const targetPlayer = bot.players[args[0]];
            if (targetPlayer) {
                bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer.entity, 1));
                logMessage(`🚶 Following ${args[0]}`);
                message.reply(`✅ Following ${args[0]}.`);
            } else {
                message.reply("⚠️ Player not found.");
            }
        }

        if (action === "stop") {
            bot.pathfinder.setGoal(null);
            logMessage("🛑 Bot stopped movement.");
            message.reply("✅ Stopped bot movement.");
        }

        if (action === "status") {
            message.reply(`📊 **Status:**\n❤️ Health: ${bot.health}\n📍 Position: X: ${bot.entity.position.x.toFixed(1)}, Y: ${bot.entity.position.y.toFixed(1)}, Z: ${bot.entity.position.z.toFixed(1)}`);
        }

        if (action === "inventory") {
            let inventoryList = bot.inventory.items().map(item => `${item.name} x${item.count}`).join("\n") || "Empty";
            message.reply(`🎒 **Inventory:**\n${inventoryList}`);
        }
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
