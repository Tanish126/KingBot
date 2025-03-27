const mineflayer = require("mineflayer");
const readline = require("readline");
const pvp = require("mineflayer-pvp").plugin;
const { pathfinder, Movements } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const AutoAuth = require("mineflayer-auto-auth");
const fs = require("fs");
const { GoalBlock } = require("mineflayer-pathfinder").goals;

// Log files
const LOG_FILE = "chat_logs.txt";
const CHATGAME_LOG = "chatgames_log.txt";
const MOVEMENT_LOG = "movement_log.txt";

let lastChatGameTime = 0;
let lastSentAnswer = null;
let pendingEquations = [];
let solvingEquation = false;

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

// Bot creation function
function createBot() {
    const bot = mineflayer.createBot({
        host: "play.potionmc.xyz",
        version: false,
        username: "CreeperDash12",
        port: 25565,
        plugins: [AutoAuth],
        AutoAuth: { password: "843271" },
    });

    bot.loadPlugin(pvp);
    bot.loadPlugin(armorManager);
    bot.loadPlugin(pathfinder);

    bot.on("spawn", () => {
        logMessage("✅ Bot has spawned and is connected!");
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

    function findAndClickLifesteal() {
        const lifestealSlot = window.slots.findIndex(
            (item) => item && item.displayName.includes("Purple Dye")
        );

        if (lifestealSlot !== -1) {
            logMessage(`🌟 Lifesteal Realm found in slot ${lifestealSlot}. Clicking...`);
            bot.clickWindow(lifestealSlot, 0, 0);
        } else {
            logMessage("Lifesteal Realm not found! Retrying in 2 seconds...");
            setTimeout(findAndClickLifesteal, 2000);
        }
    }

    findAndClickLifesteal();
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
                setTimeout(() => bot.chat(answer.toString()), 2000);
                logMessage(`🟢 Sent Equation Answer: ${answer}`, CHATGAME_LOG);
            } else {
                logMessage("❌ Failed to solve the equation.", CHATGAME_LOG);
            }
            solvingEquation = false;
        }

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

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.trim()) {
            logMessage(`💬 Sending message: ${input}`);
            bot.chat(input);
        }
    });
}

createBot();
