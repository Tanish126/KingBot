const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { Vec3 } = require("vec3"); // Correctly import Vec3

function createBot() {
  const bot = mineflayer.createBot({
    host: "play.stealfun.net",
    version: false, // Set to the correct Minecraft version if needed
    username: "CakeEater89",
    port: 25565,
    plugins: [AutoAuth],
    AutoAuth: {
      password: "IamGOAT", // Updated password
    },
  });

  // Load plugins
  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let botReady = false;
  let selection1 = null;
  let selection2 = null;

  // Initialize Minecraft data and movements after spawn
  bot.once("spawn", () => {
    try {
      const mcData = require("minecraft-data")(bot.version);
      if (!mcData) {
        throw new Error("Failed to load Minecraft data. Check the server version.");
      }
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
      console.log("[BOT] Spawned and connected!");
      botReady = true;
    } catch (error) {
      console.error("[ERROR] Initialization failed:", error);
    }
  });

  // Handle errors and kicks
  bot.on("kicked", (reason) => console.log(`[BOT] Kicked: ${reason}`));
  bot.on("error", (err) => console.log(`[ERROR] ${err}`));

  // Restart bot on disconnect
  bot.on("end", () => {
    console.log("[BOT] Disconnected. Restarting in 5 seconds...");
    setTimeout(createBot, 5000); // Add a delay before restarting
  });

  // Set Selection 1
  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    if (message === "#sel 1") {
      selection1 = bot.entity.position.floored();
      console.log(`[BOT] Selection 1 set at ${selection1.x}, ${selection1.y}, ${selection1.z}`);
    }

    // Set Selection 2
    else if (message === "#sel 2") {
      selection2 = bot.entity.position.floored();
      console.log(`[BOT] Selection 2 set at ${selection2.x}, ${selection2.y}, ${selection2.z}`);
    }

    // Start mining
    else if (message === "cleararea") {
      clearArea();
    }
  });

  // Function to mine a block
  const digBlock = async (x, y, z) => {
    const block = bot.blockAt(new Vec3(x, y, z));
    if (block && block.type !== 0 && bot.canSeeBlock(block)) { // Prevents digging air or unseen blocks
      await bot.dig(block);
    }
  };

  // Function to mine layer by layer
  const clearLayer = async (y) => {
    if (!selection1 || !selection2) {
      console.log("[ERROR] Selection points not set!");
      return;
    }

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

  // Function to mine the entire area
  const clearArea = async () => {
    if (!selection1 || !selection2) {
      console.log("[ERROR] Selection points not set!");
      return;
    }

    const minY = Math.min(selection1.y, selection2.y);
    const maxY = Math.max(selection1.y, selection2.y);
    const minX = Math.min(selection1.x, selection2.x);
    const maxX = Math.max(selection1.x, selection2.x);
    const minZ = Math.min(selection1.z, selection2.z);
    const maxZ = Math.max(selection1.z, selection2.z);

    console.log(`[BOT] Clearing area from (${minX}, ${minY}, ${minZ}) to (${maxX}, ${maxY}, ${maxZ})...`);

    for (let y = maxY; y >= minY; y--) { // Start from the top layer to prevent floating blocks
      await clearLayer(y);
    }

    console.log("[BOT] Area cleared!");
  };
}

// Start the bot
createBot();
