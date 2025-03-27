const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { Vec3 } = require("vec3"); // Import Vec3 for block positions

function createBot() {
  const bot = mineflayer.createBot({
    host: "play.stealfun.net",
    version: false, // Set to the correct Minecraft version if needed
    username: "CakeEater69",
    port: 25565,
    plugins: [AutoAuth],
    AutoAuth: {
      password: "IamGOAT",
    },
  });

  // Load plugins
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let botReady = false;
  let selection1 = null;
  let selection2 = null;

  bot.once("spawn", () => {
    try {
      const mcData = require("minecraft-data")(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
      console.log("[BOT] Spawned and connected!");
      botReady = true;
    } catch (error) {
      console.error("[ERROR] Initialization failed:", error);
    }
  });

  // Handle errors and auto-restart
  bot.on("kicked", (reason) => console.log(`[BOT] Kicked: ${reason}`));
  bot.on("error", (err) => console.log(`[ERROR] ${err}`));
  bot.on("end", () => {
    console.log("[BOT] Disconnected. Restarting in 5 seconds...");
    setTimeout(createBot, 5000);
  });

  // Function to mine a block
  const digBlock = async (x, y, z) => {
    const block = bot.blockAt(new Vec3(x, y, z));
    if (block && block.type !== 0 && bot.canSeeBlock(block)) {
      await bot.dig(block);
    }
  };

  // Function to mine an entire layer
  const clearLayer = async (y) => {
    if (!selection1 || !selection2) return;
    const minX = Math.min(selection1.x, selection2.x);
    const maxX = Math.max(selection1.x, selection2.x);
    const minZ = Math.min(selection1.z, selection2.z);
    const maxZ = Math.max(selection1.z, selection2.z);

    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        await digBlock(x, y, z);
      }
    }
  };

  // Function to clear the entire area
  const clearArea = async () => {
    if (!selection1 || !selection2) {
      console.log("[ERROR] Selection points not set!");
      return;
    }

    const minY = Math.min(selection1.y, selection2.y);
    const maxY = Math.max(selection1.y, selection2.y);

    console.log("[BOT] Starting to mine the area...");
    for (let y = maxY; y >= minY; y--) {
      await clearLayer(y);
    }
    console.log("[BOT] Area cleared!");
  };

  // Readline interface for terminal commands
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on("line", (input) => {
    if (input === "#sel 1") {
      selection1 = bot.entity.position.floored();
      console.log(`[BOT] Selection 1 set at ${selection1.x}, ${selection1.y}, ${selection1.z}`);
    } else if (input === "#sel 2") {
      selection2 = bot.entity.position.floored();
      console.log(`[BOT] Selection 2 set at ${selection2.x}, ${selection2.y}, ${selection2.z}`);
    } else if (input === "cleararea") {
      clearArea();
    } else {
      bot.chat(input);
      console.log(`[BOT] Sent: ${input}`);
    }
  });

  // Chat-based commands
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "#sel 1") {
      selection1 = bot.entity.position.floored();
      bot.chat(`[BOT] Selection 1 set at ${selection1.x}, ${selection1.y}, ${selection1.z}`);
    } else if (message === "#sel 2") {
      selection2 = bot.entity.position.floored();
      bot.chat(`[BOT] Selection 2 set at ${selection2.x}, ${selection2.y}, ${selection2.z}`);
    } else if (message === "cleararea") {
      bot.chat("[BOT] Starting to clear area...");
      clearArea();
    }
  });
}

// Start the bot
createBot();
