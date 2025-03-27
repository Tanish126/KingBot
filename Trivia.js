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
let triviaActive = false;
let triviaLines = [];

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
    }, 3000000); // Move every 30 seconds
}

// Function to answer trivia questions
function answerTrivia(bot, question) {
    // Example: Simple trivia database
    const triviaDatabase = {
        "What material is used to craft a crossbow?": "String and Sticks",
        "What is the name of the mob that drops blaze rods when defeated in the Nether?": "Blaze",
        "What is the name of the structure that spawns with a spawner and contains loot chests?": "Dungeon",
        "What is the name of the rare item that can be used to create a beacon and is found in the End?": "Nether Star",
        "What is the most popular server in Minecraft?": "Hypixel",
        "What is the name of the mob that is neutral until provoked and attacks with a trident?": "Drowned",
        "What material is used to craft an enchanting table?": "Obsidian, Diamonds, and Books",
        "What tool is used to mine redstone ore?": "Iron Pickaxe",
        "What resource do players use to enchant items at an enchanting table?": "Experience Levels",
        "What item is used to heal the player or other mobs in Minecraft?": "Golden Apple",
        "What resource do players get from sheeps when defeated in Minecraft?": "Wool",
        "What item can be used to brew potions in Minecraft?": "Brewing Stand",
        "What is the name of the item that can be used to craft a bed?": "Wool and Wooden Planks",
        "What block do you need to use to craft a furnace in Minecraft?": "Cobblestone",
        "What item is used to create a potion of fire resistance?": "Blaze Powder",
        "What biome is known for its tall grass and is often associated with horses?": "Plains",
        "What is the name of the dragon boss found in the End dimension?": "Ender Dragon",
        "What type of block is used to craft a note block?": "Wood Planks",
        "What is the name of the dimension you enter through a portal made of obsidian?": "Nether",
        "What liquid is commonly used in Minecraft?": "Water",
        "What is the primary use of a hopper in Minecraft?": "Item Transport",
    };

    // Check if the question exists in the database
    const answer = triviaDatabase[question];
    if (answer) {
        // Add a 2-second delay before answering
        setTimeout(() => {
            bot.chat(answer);
            logMessage(`🟢 Sent Trivia Answer: ${answer}`, CHATGAME_LOG);
        }, 2000); // 2-second delay
    } else {
        logMessage(`❌ No answer found for trivia question: ${question}`, CHATGAME_LOG);
    }
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
                // Add 2-second delay before sending the answer
                setTimeout(() => {
                    bot.chat(answer.toString());
                    logMessage(`🟢 Sent Equation Answer: ${answer}`, CHATGAME_LOG);
                }, 2000); // 2-second delay
            } else {
                logMessage("❌ Failed to solve the equation.", CHATGAME_LOG);
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
                // Add 2-second delay before sending the answer
                setTimeout(() => {
                    bot.chat(answer);
                    logMessage(`🟢 Sent Math Answer: ${answer}`, CHATGAME_LOG);
                }, 2000); // 2-second delay
            }
        }

        // Detect and respond to trivia games
        const triviaMatch = msg.match(/ꜰɪʀѕᴛ ᴘʟᴀʏᴇʀ ᴛᴏ ᴀɴsᴡᴇʀ "(.*?)"/i);
        if (triviaMatch) {
            const triviaQuestion = triviaMatch[1];
            logMessage(`📢 Detected Trivia Game! Question: ${triviaQuestion}`, CHATGAME_LOG);
            answerTrivia(bot, triviaQuestion);
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

    // Readline for manual chat input and commands
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (input) => {
        if (input.trim()) {
            if (input.startsWith("move")) {
                // Command to move the bot manually
                if (!bot.entity || !bot.entity.position) {
                    logMessage("⚠️ Bot entity missing, cannot move.", MOVEMENT_LOG);
                    return;
                }

                const x = bot.entity.position.x + (Math.random() * 2 - 1);
                const z = bot.entity.position.z + (Math.random() * 2 - 1);
                const y = bot.entity.position.y;

                bot.pathfinder.setGoal(new goals.GoalBlock(Math.floor(x), Math.floor(y), Math.floor(z)));
                logMessage(`🚶 Manual move to X:${x.toFixed(2)}, Y:${y.toFixed(2)}, Z:${z.toFixed(2)}`, MOVEMENT_LOG);
            } else {
                logMessage(`💬 Sending message: ${input}`);
                bot.chat(input);
            }
        }
    });
}

createBot();
