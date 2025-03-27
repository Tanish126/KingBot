const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");

const LOG_FILE = "chat_logs.txt";
const MINING_LOG = "mining_log.txt";
const MOVEMENT_LOG = "movement_log.txt";

let isMining = false;

// Logging Function
function logMessage(message, file = LOG_FILE) {
    const now = new Date();
    const istTime = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    }).format(now);
    const timestamp = `[${istTime} IST]`;
    const logEntry = `${timestamp} ${message}\n`;
    console.log(logEntry.trim());
    fs.appendFileSync(file, logEntry);
}

// Move bot to target position
function moveTo(bot, x, y, z, callback) {
    logMessage(`🚶 Moving to (${x}, ${y}, ${z})`, MOVEMENT_LOG);
    bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z), true);
    
    bot.once("goal_reached", () => {
        logMessage(`✅ Reached destination: (${x}, ${y}, ${z})`, MOVEMENT_LOG);
        if (callback) callback();
    });
}

// Mining function
function startMining(bot, x1, y1, z1, x2, y2, z2) {
    if (isMining) return logMessage("⛏️ Already mining!", MINING_LOG);

    isMining = true;
    logMessage(`Starting mining from (${x1}, ${y1}, ${z1}) to (${x2}, ${y2}, ${z2})`, MINING_LOG);

    moveTo(bot, x1, y1, z1, () => {
        mineBlocks(bot, x1, y1, z1, x2, y2, z2);
    });
}

// Mining logic with delay to bypass anti-cheat
function mineBlocks(bot, x1, y1, z1, x2, y2, z2) {
    function mineNextBlock() {
        if (!isMining) return;

        let targetBlock = bot.blockAt(bot.entity.position.offset(1, 0, 0)); // Block in front
        if (!targetBlock || targetBlock.type === 0) {
            logMessage("⛔ No block to mine!", MINING_LOG);
            return;
        }

        bot.lookAt(targetBlock.position.offset(0.5, 0.5, 0.5), true, () => {
            bot.dig(targetBlock, false, () => {
                logMessage(`⛏️ Mined block: ${targetBlock.name} at ${targetBlock.position}`, MINING_LOG);

                // Move forward after mining
                const newX = bot.entity.position.x + 1;
                bot.pathfinder.setGoal(new goals.GoalBlock(Math.floor(newX), bot.entity.position.y, bot.entity.position.z), true);
                
                setTimeout(mineNextBlock, Math.random() * 1000 + 500); // Random delay (500ms - 1500ms)
            });
        });
    }

    mineNextBlock();
}

// Stop mining
function stopMining() {
    isMining = false;
    logMessage("🛑 Mining stopped.", MINING_LOG);
}

// Use compass and open GUI
function useCompass(bot) {
    setTimeout(() => {
        const compass = bot.inventory.items().find(item => item.name.includes("compass"));
        if (compass) {
            logMessage("🧭 Using compass...");
            bot.activateItem();
        } else {
            logMessage("⚠️ Compass not found, retrying...");
            setTimeout(() => useCompass(bot), 3000); // Retry after 3s
        }
    }, 3000);
}

// Handle GUI for Lifesteal
function handleGUI(bot) {
    bot.on("windowOpen", (window) => {
        logMessage("🎮 GUI opened!");

        const lifestealSlot = window.slots.findIndex(item => item && item.displayName.includes("Purple Dye"));
        if (lifestealSlot !== -1) {
            logMessage(`🌟 Clicking Lifesteal in slot ${lifestealSlot}`);
            bot.clickWindow(lifestealSlot, 0, 0);
        } else {
            logMessage("⚠️ Lifesteal not found.");
        }
    });
}

// Create bot
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
        logMessage("✅ Bot has spawned!");
        useCompass(bot);
        handleGUI(bot);
    });

    bot.on("message", async (jsonMsg) => {
        const msg = jsonMsg.toString();
        logMessage(msg);
    });

    bot.on("kicked", (reason) => logMessage(`🚫 Bot was kicked: ${reason}`));
    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
    bot.on("end", () => {
        logMessage("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    // Fix armor manager error
    bot.on("playerCollect", async (collector, itemDrop) => {
        try {
            if (!itemDrop.metadata) return;
        } catch (error) {
            logMessage("⚠️ Failed to retrieve item metadata, skipping item.");
        }
    });

    // Readline for manual control
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.startsWith("mine ")) {
            const coords = input.split(" ").slice(1).map(Number);
            if (coords.length === 6) {
                startMining(bot, ...coords);
            } else {
                logMessage("❌ Invalid mining coordinates! Use: mine x1 y1 z1 x2 y2 z2");
            }
        } else if (input.trim() === "stop") {
            stopMining();
        } else {
            bot.chat(input);
            logMessage(`💬 Sent: ${input}`);
        }
    });
}

createBot();
