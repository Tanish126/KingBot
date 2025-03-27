const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const axios = require("axios");
const fs = require("fs");
const { GoalBlock } = require("mineflayer-pathfinder").goals;
// Together AI API Key (Replace with your actual key)
const TOGETHER_API_KEY = "13bae9d85dc6760e6d68dc3b7235400c1b15f56831478e1094899431ad834121";

// Log files
const LOG_FILE = "chat_logs.txt";
const CHATGAME_LOG = "chatgames_log.txt";
const MOVEMENT_LOG = "movement_log.txt";

// Last answer sent by the bot
let lastSentAnswer = null;

// Function to log messages
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

// Function to solve math problems
function solveMathProblem(question) {
    try {
        let formatted = question.replace(/[^0-9+\-*/().]/g, ""); // Keep only valid math characters
        if (/^[0-9+\-*/(). ]+$/.test(formatted)) {
            let answer = eval(formatted); // Solve the equation
            return answer.toString();
        }
    } catch (error) {
        logMessage("❌ Math Solver Error: " + error.message);
    }
    return null;
}

// Function to move bot randomly after 30 seconds
function moveBotOnce(bot) {
  setTimeout(() => {
    if (!bot.entity || !bot.entity.position) {
      logMessage("Bot entity missing, cannot move.", MOVEMENT_LOG);
      return;
    }

    const directions = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 }
    ];

    let moveSuccess = false;
    for (let i = 0; i < directions.length; i++) {
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      const targetPos = bot.entity.position.offset(randomDir.x, randomDir.y, randomDir.z);
      const belowBlock = bot.blockAt(targetPos.offset(0, -1, 0));
      const blockAtTarget = bot.blockAt(targetPos);

      if (blockAtTarget?.boundingBox === "empty" && belowBlock?.boundingBox !== "empty") {
        logMessage(`🚶 Moving bot to X:${targetPos.x}, Y:${targetPos.y}, Z:${targetPos.z}`, MOVEMENT_LOG);
        bot.pathfinder.setGoal(new GoalBlock(targetPos.x, targetPos.y, targetPos.z));
        moveSuccess = true;
        break;
      }
    }

    if (!moveSuccess) {
      logMessage("❌ No valid movement path found, cancelling movement.", MOVEMENT_LOG);
    }
  }, 30000);
}

// Function to ask Together AI (LLaMA 3)
async function askChatGPT(prompt) {
  try {
    const response = await axios.post(
      "https://api.together.xyz/v1/chat/completions",
      {
        model: "meta-llama/Llama-3-8B-Instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50
      },
      {
        headers: {
          "Authorization": `Bearer ${TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    logMessage("Error calling Together AI API: " + error.message);
    return null;
  }
}

// Bot creation function
function createBot() {
  const bot = mineflayer.createBot({
    host: "play.potionmc.xyz",
    version: false,
    username: "DgytonTop",
    port: 25565,
    plugins: [AutoAuth],
    AutoAuth: { password: "553532" },
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  bot.on("spawn", () => {
    logMessage("Bot has spawned and is connected!");
    moveBotOnce(bot);

    setTimeout(() => {
      const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
      if (compass) {
        logMessage("🧭 Compass found! Opening it...");
        bot.activateItem();
      } else {
        logMessage("Compass not found.");
      }
    }, 3000);
  });

  bot.on("windowOpen", (window) => {
    logMessage("🎮 GUI opened!");
    window.slots.forEach((item, index) => {
      if (item) logMessage(`Slot ${index}: ${item.displayName}`);
    });

    const lifestealSlot = window.slots.findIndex(
      (item) => item && item.displayName.includes("Purple Dye")
    );
    if (lifestealSlot !== -1) {
      logMessage(`🌟 Lifesteal Realm found in slot ${lifestealSlot}`);
      bot.clickWindow(lifestealSlot, 0, 0);
    } else {
      logMessage("Lifesteal Realm not found!");
    }
  });

  bot.on("message", async (jsonMsg) => {
    const msg = jsonMsg.toString();
    logMessage(msg);

    if (msg.includes("ᴄʜᴀᴛɢᴀᴍᴇѕ")) {
      logMessage("📢 Detected a Chat Game!", CHATGAME_LOG);
    }

    const gameMatch = msg.match(/"([^"]+)"/);
    if (gameMatch) {
      const gameQuestion = gameMatch[1];
      logMessage(`🛠 Chat Game Question Detected: ${gameQuestion}`, CHATGAME_LOG);

      let answer = solveMathProblem(gameQuestion); // Try solving math problem
      if (!answer) {
        answer = await askChatGPT(`Solve this chat game question: ${gameQuestion}`);
      }

      if (answer) {
        lastSentAnswer = answer;
        setTimeout(() => bot.chat(answer), 1000);
        logMessage(`🟢 Sent Chat Game Answer: ${answer}`, CHATGAME_LOG);
      }
    }

    if (msg.includes("ᴛʜᴇ ᴄᴏʀʀᴇᴄᴛ ᴀɴsᴡᴇʀ ᴡᴀs")) {
      const correctAnswerMatch = msg.match(/"([^"]+)"/);
      if (correctAnswerMatch) {
        const correctAnswer = correctAnswerMatch[1];
        if (lastSentAnswer === correctAnswer) {
          logMessage(`🎉 Chat Game Won! Correct Answer: ${correctAnswer}`, CHATGAME_LOG);
        } else {
          logMessage(`❌ Chat Game Lost. Correct Answer: ${correctAnswer}, Bot's Answer: ${lastSentAnswer}`, CHATGAME_LOG);
        }
      }
      lastSentAnswer = null;
    }
  });

  bot.on("kicked", (reason) => logMessage(`🚫 Bot was kicked: ${reason}`));
  bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`));
  bot.on("end", () => {
    logMessage("🔄 Bot disconnected. Restarting...");
    createBot();
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on("line", (input) => {
    if (input.trim()) {
      logMessage(`💬 Sending message: ${input}`);
      bot.chat(input);
    }
  });
}

createBot();
