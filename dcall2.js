const { Client, GatewayIntentBits } = require("discord.js");
const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const express = require("express");
const fs = require("fs");

// 🔴 Replace with your Discord Bot Token and Channel ID
const DISCORD_TOKEN = "NzUwOTQwNDEwMzQ3NzgyMTQ0.GETkJZ.DT6b5VLqW4Wk07UqitdinoFsxL_ZIoefW_D5Rg";  
const DISCORD_CHANNEL_ID = "1320095408390934595"; 

// Log files
const LOG_FILE = "chat_logs.txt";
const MOVEMENT_LOG = "movement_log.txt";

// Admin users who can control the bot
const ADMIN_USERS = ["616864026088964096"]; // Replace with Discord user IDs

let isMoving = false;
let bot;

// Setup Discord Bot
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

// Logging Function
function logMessage(message, file = LOG_FILE) {
    const timestamp = `[${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}]`;
    const logEntry = `${timestamp} ${message}\n`;

    console.log(logEntry.trim());
    fs.appendFileSync(file, logEntry);
    sendToDiscord(logEntry.trim());
}

// Move bot randomly to prevent AFK
function moveBot(bot) {
    if (isMoving) return;
    isMoving = true;

    setInterval(() => {
        if (!bot.entity || !bot.entity.position) return;

        const x = bot.entity.position.x + (Math.random() * 5 - 2.5);
        const z = bot.entity.position.z + (Math.random() * 5 - 2.5);
        const y = bot.entity.position.y;

        bot.pathfinder.setGoal(new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
        logMessage(`🚶 Moving bot to X:${x.toFixed(2)}, Y:${y.toFixed(2)}, Z:${z.toFixed(2)}`, MOVEMENT_LOG);
    }, 30000);
}

// Drop all items
function dropAllItems(bot) {
    let items = bot.inventory.items();
    if (items.length === 0) {
        logMessage("🔹 Inventory is empty.");
        return;
    }

    items.forEach(item => {
        bot.tossStack(item, (err) => {
            if (err) {
                logMessage(`❌ Failed to drop ${item.name}: ${err.message}`);
            } else {
                logMessage(`🟢 Dropped ${item.name}`);
            }
        });
    });
}

// Create Minecraft Bot
function createBot() {
    bot = mineflayer.createBot({
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
        logMessage(jsonMsg.toString());
    });

    bot.on("kicked", (reason) => logMessage(`🚫 Bot was kicked: ${reason}`));
    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
    bot.on("end", () => {
        logMessage("🔄 Bot disconnected. Restarting...");
        setTimeout(createBot, 5000);
    });

    // Handle Discord commands
    discordClient.on("messageCreate", (message) => {
        if (message.author.bot || !message.content.startsWith("!bot ")) return;
        if (!ADMIN_USERS.includes(message.author.id)) {
            message.reply("🚫 You don't have permission to use bot commands.");
            return;
        }

        const command = message.content.slice(5).trim();
        logMessage(`💬 Discord Command: ${command}`);

        if (command === "dropall") {
            dropAllItems(bot);
        } else if (command === "inventory") {
            const items = bot.inventory.items().map(i => i.name).join(", ") || "Empty";
            message.reply(`📦 Inventory: ${items}`);
        } else {
            bot.chat(command);
        }
    });

    // Handle Console Commands
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.trim()) {
            logMessage(`💬 Sending message: ${input}`);
            bot.chat(input);
        }
    });
}

// Create Web Panel
const app = express();
app.get("/", (req, res) => {
    if (!bot || !bot.entity) return res.send("❌ Bot is not online.");

    const botData = {
        position: bot.entity.position,
        health: bot.health,
        inventory: bot.inventory.items().map(i => i.name),
    };

    res.json(botData);
});

app.listen(3000, () => {
    console.log("🌍 Web panel running at http://localhost:3000");
});

// Start Bot & Discord Bot
discordClient.login(DISCORD_TOKEN).catch(console.error);
createBot();
