const express = require("express");
const http = require("http");
const mineflayer = require('mineflayer');
const readline = require('readline');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armorManager = require('mineflayer-armor-manager');
const AutoAuth = require('mineflayer-auto-auth');
const app = express();

// Set up express app to keep the bot alive in the cloud
app.use(express.json());
app.get("/", (_, res) => res.send("Bot is running")); // simple text response
app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running on port ' + (process.env.PORT || 3000));
});

// Ensure Replit stays alive by pinging the server every 5 minutes
setInterval(() => {
  http.get(`http://localhost:${process.env.PORT || 3000}/`);
}, 300000); // Every 5 minutes (300000 ms)

// Bot creation function (same as your existing bot setup code)
function createBot() {
  const bot = mineflayer.createBot({
    host: 'play.potionmc.xyz',
    version: false,
    username: 'DgYtOnTop',
    port: 25565,
    plugins: [AutoAuth],
    AutoAuth: {
      password: '553532' // Set the password here, or use process.env.PASSWORD if stored in an environment variable
    }
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let botReady = false;

  bot.on('spawn', () => {
    console.log("Bot has spawned and is connected to the server!");
    botReady = true;
  });

  bot.on('playerCollect', (collector, itemDrop) => {
    if (collector !== bot.entity) return;
    setTimeout(() => {
      const sword = bot.inventory.items().find(item => item.name.includes('sword'));
      if (sword) bot.equip(sword, 'hand');
    }, 150);
  });

  bot.on('chat', (username, message) => {
    console.log(`[${username}] ${message}`);
  });

  bot.on('kicked', console.log);
  bot.on('error', console.log);
  bot.on('end', createBot);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', (input) => {
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

  setInterval(() => {
    if (botReady) {
      bot.chat('/server survival');
      console.log("Sent '/server survival' to the server.");
    }
  }, 50000);
}

// Start the bot
createBot();
