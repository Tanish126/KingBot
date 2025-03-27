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

// Load chat game dictionary
const chatGameWords = require("./chatgame_words.json");

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

// Function to add correct answers to the dictionary
function addCorrectAnswer(answer) {
    if (!chatGameWords.includes(answer)) {
        chatGameWords.push(answer);
        fs.writeFileSync("./chatgame_words.json", JSON.stringify(chatGameWords, null, 4));
        logMessage(`✅ Added new chat game word: ${answer}`, CHATGAME_LOG);
    }
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

        // Random delay between 1500ms and 2300ms
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
    bot.on("error", (err) => logMessage(`⚠️ Error: ${err.message}`, LOG_FILE));
    bot.on("end", () => logMessage("🛑 Bot has disconnected.", LOG_FILE));

    bot.on("health", (health) => {
        if (health < 10) {
            logMessage("⚠️ Low health detected!", LOG_FILE);
            bot.chat("/spawn");
        }
    });

    bot.on("goal_reached", (goal) => {
        logMessage(`✅ Reached goal at X:${goal.x}, Y:${goal.y}, Z:${goal.z}`, MOVEMENT_LOG);
    });

    bot.on("time", (time) => {
        logMessage(`⏰ Current Time: ${time}`, MOVEMENT_LOG);
    });

    bot.on("message", (jsonMsg) => {
        const msg = jsonMsg.toString();
        logMessage(msg);

        // Check if message is a math problem
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

        // Check for chat game answer
        detectAndRespondToChatGame(bot, msg);
    });

    bot.on("chat", (username, message) => {
        if (username === bot.username) return; // Ignore bot's own messages

        // Log all chat messages to the log file
        logMessage(`${username}: ${message}`);

        // Check if message is related to math problem
        const mathProblemMatch = message.match(/(.*)\s?=\s?([0-9]+)/);
        if (mathProblemMatch) {
            const question = mathProblemMatch[1];
            const result = solveMathProblem(question);
            if (result) {
                logMessage(`🧮 Solved math problem: ${result}`);
                bot.chat(result);
            }
        }

        // Handle equation-based games
        if (message.includes("ʏᴏᴜ ʜᴀᴠᴇ 25 ѕᴇᴄᴏɴᴅѕ ᴛᴏ ѕᴏʟᴠᴇ:")) {
            if (Date.now() - lastChatGameTime < 300000) return; // Prevent solving the same game too often
            lastChatGameTime = Date.now();
            pendingEquations = [];
            solvingEquation = true;
            lastSentAnswer = null; // Reset last answer at the start
            logMessage("📢 Detected an Equation Chat Game.", CHATGAME_LOG);
        }

        if (solvingEquation && message.includes("=") && message.includes("+")) {
            pendingEquations.push(message);
            logMessage(`📥 Captured Equation: ${message}`, CHATGAME_LOG);
        }

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
                    }, 3500); // 3.5 seconds cooldown
                }
            } else {
                if (!cooldownActive) {
                    logMessage("❌ Failed to solve the equation.", CHATGAME_LOG);
                    cooldownActive = true; // Activate cooldown
                    setTimeout(() => {
                        cooldownActive = false; // Reset cooldown
                    }, 10000000); // Infinite cooldown (essentially does nothing)
                }
            }
            solvingEquation = false;
        }
    });

    // Start bot
    createBot();
}
