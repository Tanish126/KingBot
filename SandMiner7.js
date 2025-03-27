const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { HttpsProxyAgent } = require("https-proxy-agent");
const minecraftData = require("minecraft-data");

const proxyUrl = "http://pziijepn:nnnimtnx5g4e@161.123.152.115:6360";
let miningActive = false; // ⛏️ Mining toggle state

function createBot() {
    const agent = new HttpsProxyAgent(proxyUrl);
    const bot = mineflayer.createBot({
        host: "play.potionmc.xyz",
        username: "MACE_HACKER1",
        port: 25565,
        agent: agent,
        plugins: [AutoAuth],
        AutoAuth: { password: "MACE_HACKER" },
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    bot.on("spawn", () => {
        console.log("✅ Bot spawned!");

        const mcData = minecraftData(bot.version);
        const defaultMovements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(defaultMovements);

        // 🔹 **Lifesteal Joining Process**
        setTimeout(() => {
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                console.log("🎯 Compass found! Opening...");
                bot.activateItem();
            } else {
                console.log("❌ Compass not found!");
            }
        }, 3000);

        bot.on("windowOpen", (window) => {
            console.log("🗂️ GUI opened!");

            const lifestealSlot = window.slots.findIndex(
                (item) => item && item.displayName.includes("Purple Dye")
            );

            if (lifestealSlot !== -1) {
                console.log(`🌍 Lifesteal Realm found in slot ${lifestealSlot}, selecting...`);
                bot.clickWindow(lifestealSlot, 0, 0);
            } else {
                console.log("❌ Lifesteal Realm not found in the GUI!");
            }
        });
    });

    bot.on("chat", (username, message) => console.log(`[${username}] ${message}`));
    bot.on("kicked", console.log);
    bot.on("error", console.log);
    bot.on("end", () => {
        console.log("🔄 Restarting bot...");
        createBot();
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.on("line", (input) => {
        const lowerInput = input.toLowerCase().trim();

        // Prevent mining commands from being sent to chat
        if (lowerInput === "mine on" || lowerInput === "mine off" || lowerInput === "mine status") {
            handleCommand(lowerInput);
            return;
        }

        // Send all other inputs to Minecraft chat
        bot.chat(input);
    });

    /** 🔥 **Optimized Sand Mining** */
    async function startMiningSand() {
        console.log("⛏️ Mining sand started...");
        miningActive = true;

        while (miningActive) {
            const sandBlock = findNearestSand();
            if (!sandBlock) {
                console.log("⏳ No sand found nearby, waiting...");
                await bot.waitForTicks(20);
                continue;
            }

            // Move to the sand block
            const moved = await moveToBlock(sandBlock);
            if (!moved) {
                console.log("⚠️ Could not reach sand block, skipping...");
                continue;
            }

            // Mine the block only if it's still there
            const targetBlock = bot.blockAt(sandBlock.position);
            if (targetBlock && targetBlock.name === "sand") {
                await fastMineBlock(targetBlock);
            }
        }

        console.log("⛏️ Mining stopped.");
    }

    /** 🏹 **Find the nearest sand block efficiently** */
    function findNearestSand() {
        const sandBlocks = bot.findBlocks({
            matching: (block) => block.name === "sand",
            maxDistance: 10,
            count: 1
        });

        return sandBlocks.length > 0 ? bot.blockAt(sandBlocks[0]) : null;
    }

    /** 🚀 **Move bot to the block position safely** */
    async function moveToBlock(block) {
        if (!block) return false;

        try {
            const goal = new goals.GoalBlock(block.position.x, block.position.y, block.position.z);
            await bot.pathfinder.goto(goal);
            await bot.waitForTicks(10);
            return true;
        } catch (err) {
            console.log("⚠️ Move failed: " + err.message);
            return false;
        }
    }

    /** 🔥 **Fast mining with optimized shovel use** */
    async function fastMineBlock(block) {
        if (!block) return;

        const shovel = bot.inventory.items().find((item) => item.name.includes("shovel"));
        if (shovel) {
            await bot.equip(shovel, "hand");
        } else {
            console.log("❌ No shovel found, mining with hand.");
        }

        try {
            await bot.dig(block, true);
        } catch (err) {
            console.log("⚠️ Mining failed: " + err.message);
        }
    }

    /** 🔹 **Handle Console Commands** */
    function handleCommand(command) {
        if (command === "mine on") {
            if (!miningActive) {
                console.log("✅ Mining enabled.");
                startMiningSand();
            } else {
                console.log("⚠️ Mining is already active.");
            }
        } else if (command === "mine off") {
            if (miningActive) {
                console.log("⛔ Mining disabled.");
                miningActive = false;
            } else {
                console.log("⚠️ Mining is already off.");
            }
        } else if (command === "mine status") {
            console.log(miningActive ? "⛏️ Mining is active." : "⛔ Mining is inactive.");
        } else {
            console.log("⚠️ Unknown command.");
        }
    }
}

createBot();
