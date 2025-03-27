const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");

let isMining = false;
let bot;

function createBot() {
    bot = mineflayer.createBot({
        host: "play.potionmc.xyz",
        port: 25565,
        username: "ShadowCrafterX",
        plugins: [AutoAuth],
        AutoAuth: { password: "843271" }
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    bot.on("spawn", () => {
        console.log("✅ Bot has spawned!");

        // Open compass after spawning
        setTimeout(() => {
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                console.log("🧭 Compass found! Opening it...");
                bot.activateItem();
            } else {
                console.log("⚠️ Compass not found.");
            }
        }, 3000);
    });

    bot.on("windowOpen", (window) => {
        console.log("📜 GUI opened!");

        // Find and click "Lifesteal Realm"
        const lifestealSlot = window.slots.findIndex((item) => item && item.displayName.includes("Purple Dye"));
        if (lifestealSlot !== -1) {
            console.log("✅ Lifesteal Realm found! Clicking...");
            bot.clickWindow(lifestealSlot, 0, 0);
        } else {
            console.log("❌ Lifesteal Realm not found.");
        }
    });

    bot.on("message", (jsonMsg) => {
        const msg = jsonMsg.toString();
        console.log(msg);

        if (msg.includes("mine 100by100")) {
            startMiningArea(50);
        }
    });

    bot.on("error", console.log);
    bot.on("end", () => {
        console.log("🔄 Bot disconnected. Restarting...");
        createBot();
    });

    // Console input
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input === "stop mine") {
            stopMining();
        } else if (input === "mine 100by100") {
            startMiningArea(50);
        } else {
            bot.chat(input);
            console.log(`💬 Sent: ${input}`);
        }
    });
}

// Stop mining
function stopMining() {
    isMining = false;
    console.log("⛔ Stopped mining!");
}

// Start mining a 100x100 area
function startMiningArea(radius) {
    if (isMining) {
        console.log("⚠️ Already mining!");
        return;
    }
    isMining = true;

    const pos = bot.entity.position;
    const x1 = Math.floor(pos.x - radius);
    const x2 = Math.floor(pos.x + radius);
    const z1 = Math.floor(pos.z - radius);
    const z2 = Math.floor(pos.z + radius);
    const y1 = Math.floor(pos.y);
    const y2 = Math.floor(pos.y + 2); // Height 3 (y1 to y2)

    console.log(`⛏️ Mining area from (${x1}, ${y1}, ${z1}) to (${x2}, ${y2}, ${z2})`);
    mineBlocks(x1, y1, z1, x2, y2, z2);
}

// Mine blocks in a given area
async function mineBlocks(x1, y1, z1, x2, y2, z2) {
    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            for (let z = z1; z <= z2; z++) {
                if (!isMining) return; // Stop if requested

                const block = bot.blockAt({ x, y, z });
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
