const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { Vec3 } = require("vec3");

let mcData;
let isMining = false;
let stopMining = false;

function createBot() {
    const bot = mineflayer.createBot({
        host: "play.potionmc.xyz",
        port: 25565,
        username: "S",
        plugins: [AutoAuth],
        AutoAuth: { password: "B" },
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    bot.on("spawn", () => {
        mcData = require("minecraft-data")(bot.version);
        console.log("✅ Bot has spawned!");

        setTimeout(() => {
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                console.log("🧭 Compass found! Opening it...");
                bot.activateItem();
            } else {
                console.log("⚠️ Compass not found, retrying...");
            }
        }, 3000);
    });

    bot.on("windowOpen", (window) => {
        console.log("📜 GUI opened!");
        const lifestealSlot = window.slots.findIndex(item => item && item.displayName.includes("Purple Dye"));
        if (lifestealSlot !== -1) {
            console.log("🔥 Lifesteal Realm found! Clicking...");
            bot.clickWindow(lifestealSlot, 0, 0);
        } else {
            console.log("⚠️ Lifesteal Realm not found!");
        }
    });

    bot.on("message", (jsonMsg) => {
        const msg = jsonMsg.toString();
        console.log(msg);

        if (msg.startsWith("mine ")) {
            const coords = msg.split(" ").slice(1).map(Number);
            if (coords.length === 6) {
                startMining(bot, ...coords);
            } else {
                console.log("❌ Invalid mining command!");
            }
        }
    });

    bot.on("end", () => {
        console.log("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.startsWith("mine ")) {
            const coords = input.split(" ").slice(1).map(Number);
            if (coords.length === 6) {
                startMining(bot, ...coords);
            } else {
                console.log("❌ Invalid mining coordinates!");
            }
        } else if (input.trim() === "mine 100by100") {
            startMiningArea(bot);
        } else if (input.trim() === "stop mining") {
            console.log("🛑 Stopping mining...");
            stopMining = true;
        } else {
            bot.chat(input);
            console.log(`💬 Sent: ${input}`);
        }
    });
}

// **📌 Start Mining in a Given Area**
function startMining(bot, x1, y1, z1, x2, y2, z2) {
    if (isMining) return;
    isMining = true;
    stopMining = false;

    console.log(`⛏️ Mining from (${x1}, ${y1}, ${z1}) to (${x2}, ${y2}, ${z2})`);

    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new goals.GoalBlock(x1, y1, z1));

    bot.once("goal_reached", () => mineBlocks(bot, x1, y1, z1, x2, y2, z2));
}

// **📌 Mine 100x100 Area (3 Blocks High)**
function startMiningArea(bot) {
    if (isMining) return;
    isMining = true;
    stopMining = false;

    const pos = bot.entity.position;
    const x1 = pos.x - 50, x2 = pos.x + 50;
    const z1 = pos.z - 50, z2 = pos.z + 50;
    const y1 = pos.y, y2 = pos.y + 2; // 3 blocks height

    console.log(`⛏️ Mining area from (${x1}, ${y1}, ${z1}) to (${x2}, ${y2}, ${z2})`);
    startMining(bot, x1, y1, z1, x2, y2, z2);
}

// **📌 Mine Blocks**
async function mineBlocks(bot, x1, y1, z1, x2, y2, z2) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            for (let z = z1; z <= z2; z++) {
                if (stopMining) {
                    console.log("🛑 Mining stopped by user.");
                    isMining = false;
                    return;
                }

                const blockPos = new Vec3(x, y, z);
                const block = bot.blockAt(blockPos);

                if (block && block.name !== "air") {
                    try {
                        await bot.dig(block);
                        console.log(`⛏️ Mined: ${block.name} at (${x}, ${y}, ${z})`);
                    } catch (err) {
                        console.log(`⚠️ Mining error: ${err.message}`);
                    }
                }
            }
        }
    }
    console.log("✅ Mining complete!");
    isMining = false;
}

createBot();
;
}

createBot();
