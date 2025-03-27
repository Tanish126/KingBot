const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");
const Vec3 = require("vec3");

let mcData;
let isMining = false;
let stopMining = false;

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
            if (input === "mine 100by100") {
                const botPos = bot.entity.position;
                const x1 = Math.floor(botPos.x - 50);
                const x2 = Math.floor(botPos.x + 50);
                const y1 = Math.floor(botPos.y - 1); // Adjust based on mining depth
                const y2 = Math.floor(botPos.y + 2); // Adjust to cover 3 block height
                const z1 = Math.floor(botPos.z - 50);
                const z2 = Math.floor(botPos.z + 50);

                stopMining = false;
                startMining(bot, x1, y1, z1, x2, y2, z2);
            } else {
                const coords = input.split(" ").slice(1).map(Number);
                if (coords.length === 6) {
                    stopMining = false;
                    startMining(bot, ...coords);
                } else {
                    logMessage("❌ Invalid mining coordinates!");
                }
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
        for (let x = x1; x <= x2; x++) {
            for (let z = z1; z <= z2; z++) {
                if (stopMining) {
                    logMessage("⛔ Mining stopped.");
                    return;
                }

                let block = bot.blockAt(new Vec3(x, y, z));
                if (!block || !block.name || block.name === "air") continue;

                try {
                    if (!bot.canSeeBlock(block)) {
                        logMessage(`⚠️ Block at (${x}, ${y}, ${z}) is unreachable. Moving closer...`);
                        await moveCloser(bot, block.position);
                    }

                    while (true) {
                        if (stopMining) {
                            logMessage("⛔ Mining stopped.");
                            return;
                        }

                        await bot.dig(block);
                        logMessage(`⛏️ Mined: ${block.name} at (${x}, ${y}, ${z})`);
                        await bot.waitForTicks(5);

                        block = bot.blockAt(new Vec3(x, y, z));
                        if (!block || block.name === "air") break;
                    }
                } catch (err) {
                    logMessage(`⚠️ Mining error at (${x}, ${y}, ${z}): ${err.message}`);
                }
            }
        }
    }

    logMessage("✅ Mining complete!");
    isMining = false;
}

// Move closer to a block if it can't be reached
async function moveCloser(bot, blockPos, retries = 3) {
    if (retries <= 0) {
        logMessage(`❌ Failed to reach block at (${blockPos.x}, ${blockPos.y}, ${blockPos.z}) after multiple attempts.`);
        return;
    }

    return new Promise((resolve, reject) => {
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);
        bot.pathfinder.setGoal(new goals.GoalBlock(blockPos.x, blockPos.y, blockPos.z));

        bot.once("goal_reached", () => {
            logMessage(`🚶 Reached block at (${blockPos.x}, ${blockPos.y}, ${blockPos.z}).`);
            resolve();
        });

        setTimeout(() => {
            logMessage(`⚠️ Retrying move to (${blockPos.x}, ${blockPos.y}, ${blockPos.z})...`);
            moveCloser(bot, blockPos, retries - 1).then(resolve).catch(reject);
        }, 5000);
    });
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
