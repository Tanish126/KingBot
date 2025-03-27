const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { Client, GatewayIntentBits } = require("discord.js");

// Discord Bot Setup
const discordBot = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent 
  ] 
});

const discordToken = "NzUwOTQwNDEwMzQ3NzgyMTQ0.GETkJZ.DT6b5VLqW4Wk07UqitdinoFsxL_ZIoefW_D5Rg"; // Replace with your bot token
const discordChannelId = "1320095408390934595"; // Replace with your channel ID

// Bot creation function
function createBot() {
  const bot = mineflayer.createBot({
    host: "play.stealfun.net",
    version: false,
    username: "ShadowMinerX97",
    port: 25565,
    plugins: [AutoAuth],
    AutoAuth: {
      password: "483726", // Set the password here
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
        bot.activateItem();
      } else {
        console.log("Compass not found in inventory.");
      }
    }, 3000);
  });

  bot.on("windowOpen", (window) => {
    console.log("GUI opened!");
    window.slots.forEach((item, index) => {
      if (item) {
        console.log(`Slot ${index}: ${item.displayName}`);
      }
    });

    const lifestealSlot = window.slots.findIndex(
      (item) => item && item.displayName.includes("Purple Dye")
    );
    if (lifestealSlot !== -1) {
      console.log(`Lifesteal Realm found in slot ${lifestealSlot}`);
      bot.clickWindow(lifestealSlot, 0, 0);
    } else {
      console.log("Lifesteal Realm not found in any slot!");
    }
  });

  bot.on("chat", (username, message) => {
    console.log(`[${username}] ${message}`);
    
    // Forward Minecraft chat messages to Discord
    const channel = discordBot.channels.cache.get(discordChannelId);
    if (channel) {
      channel.send(`**[${username}]** ${message}`);
    }
  });

  bot.on("kicked", console.log);
  bot.on("error", console.log);
  bot.on("end", () => {
    console.log("Bot disconnected. Restarting...");
    createBot();
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

  // Handle Discord commands
  discordBot.on("messageCreate", (message) => {
    if (message.channel.id !== discordChannelId || message.author.bot) return;

    // Handle !sendmsg command
    if (message.content.startsWith("!sendmsg")) {
      const args = message.content.split(" ");
      if (args.length < 2) {
        return message.reply("Usage: `!sendmsg <message>`");
      }

      const msg = args.slice(1).join(" ");
      if (botReady) {
        bot.chat(msg);
        message.reply(`Sent message to Minecraft chat: ${msg}`);
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
