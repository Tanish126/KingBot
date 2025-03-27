const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000; // Render assigns a dynamic port

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});
// Discord Bot Setup
const discordBot = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent 
  ] 
});

const discordToken = "NzUwOTQwNDEwMzQ3NzgyMTQ0.G7iJ8R.ccmgLnH4vfJaj8wpFZ7_JvzUzD-h-E3CBzxXjc"; // Replace with your bot token
const discordChannelId = "1320095408390934595"; // Replace with your channel ID

// Function to send logs to Discord
function logToDiscord(message) {
  const channel = discordBot.channels.cache.get(discordChannelId);
  if (channel) {
    channel.send(`\`\`\`${message}\`\`\``);
  }
}

// Bot creation function
function createBot() {
  const bot = mineflayer.createBot({
    host: "play.stealfun.net",
    version: false,
    username: "DgYtOnTop",
    port: 25565,
    plugins: [AutoAuth],
    AutoAuth: {
      password: "553532", // Set the password here
    },
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let botReady = false;

  bot.on("spawn", () => {
    botReady = true;
    logToDiscord("✅ **Bot has spawned and is connected to the server!**");

    setTimeout(() => {
      const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
      if (compass) {
        logToDiscord("🧭 Compass found! Opening it...");
        bot.activateItem();
      } else {
        logToDiscord("❌ Compass not found in inventory.");
      }
    }, 3000);
  });

  bot.on("windowOpen", (window) => {
    logToDiscord("📜 GUI opened!");

    window.slots.forEach((item, index) => {
      if (item) {
        logToDiscord(`Slot ${index}: ${item.displayName}`);
      }
    });

    const lifestealSlot = window.slots.findIndex(
      (item) => item && item.displayName.includes("Purple Dye")
    );
    if (lifestealSlot !== -1) {
      logToDiscord(`🔮 Lifesteal Realm found in slot ${lifestealSlot}`);
      bot.clickWindow(lifestealSlot, 0, 0);
    } else {
      logToDiscord("❌ Lifesteal Realm not found in any slot!");
    }
  });

  bot.on("chat", (username, message) => {
    logToDiscord(`💬 **[${username}]** ${message}`);
  });

  bot.on("kicked", (reason) => logToDiscord(`⚠️ **Bot was kicked:** ${reason}`));
  bot.on("error", (error) => logToDiscord(`❌ **Error:** ${error}`));
  bot.on("end", () => {
    logToDiscord("🔴 **Bot disconnected. Restarting...**");
    createBot();
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (input) => {
    if (input.trim() && botReady) {
      bot.chat(input);
      logToDiscord(`📝 **Sent message:** ${input}`);
    }
  });

  discordBot.on("messageCreate", (message) => {
    if (message.channel.id !== discordChannelId || message.author.bot) return;

    if (message.content.startsWith("!sendmsg")) {
      const args = message.content.split(" ");
      if (args.length < 2) {
        return message.reply("Usage: `!sendmsg <message>`");
      }

      const msg = args.slice(1).join(" ");
      if (botReady) {
        bot.chat(msg);
        logToDiscord(`📝 **Sent message from Discord:** ${msg}`);
      } else {
        message.reply("Bot is not connected to the server.");
      }
    }
  });
}

// Start the bot
createBot();

// Log in the Discord bot
discordBot.login(discordToken);
