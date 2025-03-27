const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");

let mcData;
let isMining = false;

// Create a bot instance
function createBot() {
    const bot = mineflayer.createBot({
        host: "play.potionmc.xyz",
        port: 25565,
        username: "ShadowCrafterX",
        plugins: [AutoAuth],
        AutoAuth: { password: "843271" },
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    bot.on("spawn", () => {
        mcData = require("minecraft-data")(bot.version);  // ✅ Ensure mcData is defined on spawn
        logMessage("✅ Bot has spawned!");

        setTimeout(() => {
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                logMessage("🧭 Compass found! Opening it...");
                bot.activateItem();
            } else {
                logMessage("⚠️ Compass not found, retrying...");
            }
        }, 3000);
    });

    // ✅ Prevent Armor Manager Crashes
    bot.on("playerCollect", (collector, item) => {
        try {
            if (!item || !("itemId" in item)) return; // Prevent crashes
        } catch (error) {
            logMessage(`⚠️ Armor Manager Error: ${error.message}`);
        }
    });

    bot.on("message", (jsonMsg) => {
        const msg = jsonMsg.toString();
        logMessage(msg);

        const match = msg.match(/mine (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)/);
        if (match) {
            const [_, x1, y1, z1, x2, y2, z2] = match.map(Number);
            startMining(bot, x1, y1, z1, x2, y2, z2);
        }
    });

    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
    bot.on("end", () => {
        logMessage("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.startsWith("mine ")) {
            const coords = input.split(" ").slice(1).map(Number);
            if (coords.length === 6) {
                startMining(bot, ...coords);
            } else {
                logMessage("❌ Invalid mining coordinates!");
            }
        } else {
            bot.chat(input);
            logMessage(`💬 Sent: ${input}`);
        }
    });
}

// Function to start mining
function startMining(bot, x1, y1, z1, x2, y2, z2) {
    if (isMining) return;
    isMining = true;

    logMessage(`⛏️ Starting mining from (${x1}, ${y1}, ${z1}) to (${x2}, ${y2}, ${z2})`);

    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new goals.GoalBlock(x1, y1, z1));

    bot.once("goal_reached", () => mineBlocks(bot, x1, y1, z1, x2, y2, z2));
}

// Function to mine blocks
async function mineBlocks(bot, x1, y1, z1, x2, y2, z2) {
    for (let y = y1; y <= y2; y++) {
        for (let z = z1; z <= z2; z++) {
            const blockPos = bot.entity.position.offset(0, y - bot.entity.position.y, z - bot.entity.position.z);
            const block = bot.blockAt(blockPos);
            if (block && block.name !== "air") {
                try {
                    await bot.dig(block);
                    logMessage(`⛏️ Mined: ${block.name} at (${block.position.x}, ${block.position.y}, ${block.position.z})`);
                } catch (err) {
                    logMessage(`⚠️ Mining error: ${err.message}`);
                }
            }
        }
    }
    logMessage("✅ Mining complete!");
    isMining = false;
}

// Logging function
function logMessage(message) {
    const now = new Date();
    const istTime = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    }).format(now);
    const logEntry = `[${istTime} IST] ${message}`;
    console.log(logEntry);
}

createBot();
