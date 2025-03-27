const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");

let mcData;
let isMining = false;
let stopMining = false; // New flag to stop mining

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
        mcData = require("minecraft-data")(bot.version);
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

    bot.on("windowOpen", (window) => {
        logMessage("📜 GUI opened!");

        const lifestealSlot = window.slots.findIndex((item) => item && item.displayName.includes("Purple Dye"));
        if (lifestealSlot !== -1) {
            logMessage(`💜 Lifesteal Realm found in slot ${lifestealSlot}. Clicking...`);
            bot.clickWindow(lifestealSlot, 0, 0);
        } else {
            logMessage("❌ Lifesteal Realm not found!");
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
                stopMining = false; // Reset stop flag before starting
                startMining(bot, ...coords);
            } else {
                logMessage("❌ Invalid mining coordinates!");
            }
        } else if (input.trim().toLowerCase() === "stop") {
            stopMining = true;
            isMining = false;
            logMessage("⛔ Stopping mining...");
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
    stopMining = false;

    logMessage(`⛏️ Starting mining from (${x1}, ${y1}, ${z1}) to (${x2}, ${y2}, ${z2})`);

    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new goals.GoalBlock(x1, y1, z1));

    bot.once("goal_reached", () => mineBlocks(bot, x1, y1, z1, x2, y2, z2));
}

// Function to mine blocks continuously
async function mineBlocks(bot, x1, y1, z1, x2, y2, z2) {
    for (let y = y1; y <= y2; y++) {
        for (let z = z1; z <= z2; z++) {
            if (stopMining) {
                logMessage("⛔ Mining stopped.");
                return;
            }

            let blockPos = bot.entity.position.offset(0, y - bot.entity.position.y, z - bot.entity.position.z);
            let block = bot.blockAt(blockPos);

            if (!block || block.name === "air") continue;

            try {
                while (true) {
                    if (stopMining) {
                        logMessage("⛔ Mining stopped.");
                        return;
                    }

                    await bot.dig(block);
                    logMessage(`⛏️ Mined: ${block.name} at (${block.position.x}, ${block.position.y}, ${block.position.z})`);
                    await bot.waitForTicks(5);

                    blockPos = bot.entity.position.offset(0, y - bot.entity.position.y, z - bot.entity.position.z);
                    block = bot.blockAt(blockPos);

                    if (!block || block.name === "air") break;
                }
            } catch (err) {
                if (err.message.includes("Cannot reach block")) {
                    logMessage("⚠️ Block unreachable. Moving closer...");
                    await moveCloser(bot, block.position);
                } else {
                    logMessage(`⚠️ Mining error: ${err.message}`);
                }
            }
        }
    }

    logMessage("✅ Mining complete!");
    isMining = false;
}

// Move closer to a block if it can't be reached
async function moveCloser(bot, blockPos) {
    try {
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);
        bot.pathfinder.setGoal(new goals.GoalBlock(blockPos.x, blockPos.y, blockPos.z));

        await bot.once("goal_reached", () => logMessage("🚶 Moved closer to the block."));
    } catch (err) {
        logMessage(`⚠️ Movement error: ${err.message}`);
    }
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

// Start the bot
createBot();
