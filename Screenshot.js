const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");

// Log files
const LOG_FILE = "chat_logs.txt";
const CHATGAME_LOG = "chatgames_log.txt";
const MOVEMENT_LOG = "movement_log.txt";

let lastChatGameTime = 0;
let lastSentAnswer = null;
let pendingEquations = [];
let solvingEquation = false;
let isMoving = false; // Track if the bot is currently moving
let cooldownActive = false; // Track cooldown status

// Function to log messages with date & time
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

// Function to solve simple math problems
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

// Function to solve algebraic equations
function solveEquation(equations) {
    let values = {};
    let unknownEquation = null;
    let unknownSymbol = null;

    equations.forEach((eq) => {
        let parts = eq.split(" = ");
        let result = parseInt(parts[1]);
        let symbols = parts[0].split(" + ");

        if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
            values[symbols[0]] = result / 3;
        } else {
            let unknowns = symbols.filter(s => !(s in values));
            if (unknowns.length === 1) {
                unknownEquation = symbols;
                unknownSymbol = unknowns[0];
            }
        }
    });

    if (unknownEquation && unknownSymbol) {
        let knownSum = unknownEquation
            .filter(s => s in values)
            .reduce((sum, s) => sum + values[s], 0);
        let result = parseInt(equations.find(eq => eq.includes(unknownSymbol)).split(" = ")[1]);
        values[unknownSymbol] = result - knownSum;
        return values[unknownSymbol];
    }

    return null;
}

// Function to detect and respond to chat games
function detectAndRespondToChatGame(bot, message) {
    const typeRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴛʏᴘᴇ "(.*?)"/i;
    const unreverseRegex = /ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴜɴʀᴇᴠᴇʀѕᴇ "(.*?)"/i;

    let match = message.match(typeRegex) || message.match(unreverseRegex);
    if (match) {
        let targetText = match[1];

        if (message.includes("ᴜɴʀᴇᴠᴇʀѕᴇ")) {
            targetText = targetText.split("").reverse().join(""); 
        }

        logMessage(`📢 Detected Chat Game! Target text: ${targetText}`, CHATGAME_LOG);

        // Random delay between 2000ms and 2500ms
        const delay = Math.floor(Math.random() * (2300 - 1500 + 1)) + 1500;
        setTimeout(() => {
            bot.chat(targetText);
            logMessage(`🟢 Typed: ${targetText} (after ${delay}ms)`, CHATGAME_LOG);
        }, delay);
    }
}

// Function to move bot randomly to avoid AFK
function moveBot(bot) {
    if (isMoving) return; // Prevent moving if already moving
    isMoving = true; // Set moving status

    setInterval(() => {
        if (!bot.entity || !bot.entity.position) {
            logMessage("⚠️ Bot entity missing, cannot move.", MOVEMENT_LOG);
            return;
        }

        // Random small movement to avoid AFK detection
        const x = bot.entity.position.x + (Math.random() * 2 - 1);
        const z = bot.entity.position.z + (Math.random() * 2 - 1);
        const y = bot.entity.position.y;

        bot.pathfinder.setGoal(new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
        logMessage(`🚶 Moving bot to X:${x.toFixed(2)}, Y:${y.toFixed(2)}, Z:${z.toFixed(2)}`, MOVEMENT_LOG);
    }, 30000); // Move every 30 seconds
}

// Bot creation function
function createBot() {
    const bot = mineflayer.createBot({
        host: "play.stealfun.net",
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
        moveBot(bot);

        setTimeout(() => {
            const compass = bot.inventory.items().find((item) => item.name.includes("compass"));
            if (compass) {
                logMessage("🧭 Compass found! Opening it...");
                bot.activateItem();
            } else {
                logMessage("⚠️ Compass not found.");
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
const screenshot = require('screenshot-desktop');

// Function to take a screenshot
function takeScreenshot() {
    const filename = `screenshots/win_${Date.now()}.jpg`;
    screenshot({ filename })
        .then(() => logMessage(`📸 Screenshot saved: ${filename}`))
        .catch(err => logMessage(`❌ Screenshot error: ${err.message}`));
}

// Detect when the bot wins a chat game
bot.on("message", (jsonMsg) => {
    const msg = jsonMsg.toString();

    if (msg.includes("ᴛʜᴇ ᴄᴏʀʀᴇᴄᴛ ᴀɴsᴡᴇʀ ᴡᴀs")) {
        const correctAnswerMatch = msg.match(/"([^"]+)"/);
        if (correctAnswerMatch) {
            const correctAnswer = correctAnswerMatch[1];

            if (lastSentAnswer === correctAnswer) {
                logMessage(`🎉 Chat Game Won! Correct Answer: ${correctAnswer}`, CHATGAME_LOG);
                takeScreenshot(); // Capture a screenshot on win
            } else {
                logMessage(`❌ Chat Game Lost. Correct Answer: ${correctAnswer}, Bot's Answer: ${lastSentAnswer}`, CHATGAME_LOG);
            }
        }
        lastSentAnswer = null;
    }
});
    bot.on("message", async (jsonMsg) => {
        const msg = jsonMsg.toString();
        logMessage(msg);

        // Detect the start of an equation game
        if (msg.includes("ʏᴏᴜ ʜᴀᴠᴇ 25 ѕᴇᴄᴏɴᴅѕ ᴛᴏ ѕᴏʟᴠᴇ:")) {
            if (Date.now() - lastChatGameTime < 300000) return;
            lastChatGameTime = Date.now();
            pendingEquations = [];
            solvingEquation = true;
            lastSentAnswer = null; // Reset last answer at game start
            logMessage("📢 Detected a Chat Game (Equation).", CHATGAME_LOG);
        }

        // Capture equations
        if (solvingEquation && msg.includes("=") && msg.includes("+")) {
            pendingEquations.push(msg);
            logMessage(`📥 Captured Equation: ${msg}`, CHATGAME_LOG);
        }

        // Solve when all three equations are received
        if (pendingEquations.length === 3) {
            let answer = solveEquation(pendingEquations);
            if (answer !== null && lastSentAnswer !== answer) {
                lastSentAnswer = answer;
                if (!cooldownActive) {
                    cooldownActive = true; // Activate cooldown
                    setTimeout(() => {
                        bot.chat(answer.toString());
                        logMessage(`🟢 Sent Equation Answer: ${answer}`, CHATGAME_LOG);
                        cooldownActive = false; // Reset cooldown
                    }, 3500); // 2 seconds cooldown
                }
            } else {
                if (!cooldownActive) {
                    logMessage("❌ Failed to solve the equation.", CHATGAME_LOG);
                    cooldownActive = true; // Activate cooldown
                    setTimeout(() => {
                        cooldownActive = false; // Reset cooldown
                    }, 10000000); // 2 seconds cooldown
                }
            }
            solvingEquation = false;
        }

        // Solve simple math problems
        const mathProblemMatch = msg.match(/ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ѕᴏʟᴠᴇ "(.*?)"/);
        if (mathProblemMatch) {
            const mathQuestion = mathProblemMatch[1];
            const answer = solveMathProblem(mathQuestion);
            if (answer) {
                lastSentAnswer = answer;
                if (!cooldownActive) {
                    cooldownActive = true; // Activate cooldown
                    setTimeout(() => {
                        bot.chat(answer);
                        logMessage(`🟢 Sent Math Answer: ${answer}`, CHATGAME_LOG);
                        cooldownActive = false; // Reset cooldown
                    }, 2000); // 2 seconds cooldown
                }
            }
        }

        // Detect and respond to chat games
        detectAndRespondToChatGame(bot, msg);

        // Log correct answer from the server
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

    // Readline for manual chat input
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.trim()) {
            logMessage(`💬 Sending message: ${input}`);
            bot.chat(input);
        }
    });
}

createBot();

