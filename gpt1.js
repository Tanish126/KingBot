const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");
const { GoalBlock } = require("mineflayer-pathfinder").goals;

const LOG_FILE = "chat_logs.txt";
const CHATGAME_LOG = "chatgames_log.txt";
const MOVEMENT_LOG = "movement_log.txt";

let lastChatGameTime = 0;
let lastSentAnswer = null;

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

function solveMathProblem(question) {
  try {
    let formatted = question.replace(/[^0-9+\-*/().]/g, "");
    if (/^[0-9+\-*/(). ]+$/.test(formatted)) {
      return eval(formatted).toString();
    }
  } catch (error) {
    logMessage("❌ Math Solver Error: " + error.message);
  }
  return null;
}

function createBot() {
  const bot = mineflayer.createBot({
    host: "play.potionmc.xyz",
    version: false,
    username: "PixelPhantom99",
    port: 25565,
    plugins: [AutoAuth],
    AutoAuth: { password: "843271" },
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  bot.on("spawn", () => {
    logMessage("✅ Bot has spawned and is connected!");

    // **📌 Compass Feature: Open compass after 3 seconds**
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

    // **Find and click Lifesteal Realm (Purple Dye)**
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

    if (msg.includes("ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ѕᴏʟᴠᴇ")) {
      const currentTime = Date.now();
      if (currentTime - lastChatGameTime < 300000) {
        logMessage("⏳ Skipping chat game: Cooldown active.", CHATGAME_LOG);
        return;
      }

      logMessage("📢 Detected a Server Chat Game!", CHATGAME_LOG);
      lastChatGameTime = currentTime;

      const gameMatch = msg.match(/"([^"]+)"/);
      if (gameMatch) {
        const gameQuestion = gameMatch[1];
        logMessage(`🛠 Server Chat Game Question: ${gameQuestion}`, CHATGAME_LOG);

        let answer = solveMathProblem(gameQuestion);
        if (answer) {
          lastSentAnswer = answer;

          let delay = gameQuestion.includes("*")
            ? Math.floor(Math.random() * 1000) + 4000  // 4-5 sec delay for multiplication
            : Math.floor(Math.random() * 1000) + 2000; // 2-3 sec for other equations

          setTimeout(() => {
            bot.chat(answer);
            logMessage(`🟢 Sent Chat Game Answer: ${answer} after ${delay / 1000} sec`, CHATGAME_LOG);
          }, delay);
        }
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
