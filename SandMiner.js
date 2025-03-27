
const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const { HttpsProxyAgent } = require("https-proxy-agent");
const proxyUrl = 'http://pziijepn:nnnimtnx5g4e@161.123.152.115:6360';

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

  let isDay = true; // Assume it's day when the bot starts
  let lastPosition = null; // Store the last position before going to spawn

  bot.on("spawn", () => {
    console.log("Bot spawned!");
    checkTimeAndAct();
  });
  bot.on("chat", (username, message) => console.log(`[${username}] ${message}`));


  bot.on("kicked", console.log);
  bot.on("error", console.log);
  bot.on("end", () => { console.log("Restarting bot..."); createBot(); });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on("line", (input) => bot.chat(input));

  // Function to check if it's day or night and act accordingly
  function checkTimeAndAct() {
    const time = bot.time.timeOfDay;
    const isNowDay = time >= 0 && time < 12000; // Minecraft daytime is between 0 and 12000 ticks

    if (isNowDay && !isDay) {
      // It just became day
      console.log("It's now day. Returning to last position.");
      bot.chat("/back");
      isDay = true;
      startMiningSand();
    } else if (!isNowDay && isDay) {
      // It just became night
      console.log("It's now night. Going to spawn.");
      lastPosition = bot.entity.position.clone(); // Store the current position
      bot.chat("/spawn");
      isDay = false;
    }

    // Check again in 10 seconds
    setTimeout(checkTimeAndAct, 10000);
  }

  async function startMiningSand() {
    while (isDay) {
      const sandBlock = findSandBlock();
      if (sandBlock) {
        await mineBlock(sandBlock);
      } else {
        console.log("No sand found within 200 blocks.");
        await bot.pathfinder.goto(new pathfinder.goals.GoalNear(bot.entity.position.x, bot.entity.position.y, bot.entity.position.z, 10));
      }
      await manageInventory();
      await bot.waitForTicks(20); // Wait a bit before next iteration
    }
  }

  function findSandBlock() {
    const sandBlocks = bot.findBlocks({
      matching: block => block.name === 'sand',
      maxDistance: 200,
      count: 1
    });
    return sandBlocks.length > 0 ? bot.blockAt(sandBlocks[0]) : null;
  }

  async function mineBlock(block) {
    const shovel = bot.inventory.items().find(item => item.name.includes('shovel'));
    if (shovel) {
      await bot.equip(shovel, 'hand');
      await bot.dig(block);
      checkShovelHealth(shovel);
    } else {
      console.log("No shovel found in inventory.");
    }
  }

  function checkShovelHealth(shovel) {
    if (shovel.durability === 1) {
      const exp = bot.inventory.items().find(item => item.name === 'experience_bottle'));
      if (exp) {
        bot.equip(shovel, 'off-hand');
        bot.consume(exp, () => {
          console.log("Shovel repaired with Mending.");
        });
      }
    }
  }

  async function manageInventory() {
    if (bot.inventory.items().length === bot.inventory.inventoryEnd) {
      const shulkerBox = bot.inventory.items().find(item => item.name.includes('shulker_box'));
      if (shulkerBox) {
        await bot.equip(shulkerBox, 'hand');
        await bot.placeBlock(shulkerBox);
        const shulkerBlock = bot.blockAt(shulkerBox.position);
        await bot.openContainer(shulkerBlock);
        const sand = bot.inventory.items().find(item => item.name === 'sand');
        if (sand) {
          await bot.transfer(sand, shulkerBlock, { window: shulkerBlock.window });
        }
        await bot.closeWindow(shulkerBlock.window);
        await bot.dig(shulkerBlock);
        console.log("Shulker box filled with sand and mined.");
      } else {
        console.log("No shulker box found in inventory.");
      }
    }
  }
}

createBot();
