const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { HttpsProxyAgent } = require("https-proxy-agent");

const proxyUrl = "http://pziijepn:nnnimtnx5g4e@161.123.152.115:6360";

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
        console.log("Bot spawned!");
        bot.pathfinder.setMovements(new Movements(bot));
        startMiningSand();
    });

    bot.on("chat", (username, message) => console.log(`[${username}] ${message}`));
    bot.on("kicked", console.log);
    bot.on("error", console.log);
    bot.on("end", () => {
        console.log("Restarting bot...");
        createBot();
    });

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => bot.chat(input));

    /** 🔥 **Fast Sand Mining Function** */
    async function startMiningSand() {
        console.log("Mining sand started...");

        while (true) {
            const sandBlock = findNearestSand();
            if (!sandBlock) {
                console.log("No sand found nearby, waiting...");
                await bot.waitForTicks(10);
                continue;
            }

            await moveToBlock(sandBlock);
            await fastMineBlock(sandBlock);
        }
    }

    /** 🏹 **Find the nearest sand block efficiently** */
    function findNearestSand() {
        const sandBlocks = bot.findBlocks({
            matching: (block) => block.name === "sand",
            maxDistance: 10, // Short distance for efficiency
            count: 1
        });

        return sandBlocks.length > 0 ? bot.blockAt(sandBlocks[0]) : null;
    }

    /** 🚀 **Move bot to the block position quickly** */
    async function moveToBlock(block) {
        if (!block) return;
        const goal = new goals.GoalBlock(block.position.x, block.position.y, block.position.z);
        await bot.pathfinder.goto(goal);
    }

    /** 🔥 **Fast mining with optimized shovel use** */
    async function fastMineBlock(block) {
        if (!block) return;

        const shovel = bot.inventory.items().find((item) => item.name.includes("shovel"));
        if (shovel) {
            await bot.equip(shovel, "hand");
        } else {
            console.log("No shovel found, mining with hand.");
        }

        await bot.dig(block, true); // 'true' enables fast digging
    }
}

createBot();
