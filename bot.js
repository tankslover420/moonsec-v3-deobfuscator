const { Client, GatewayIntentBits, AttachmentBuilder, EmbedBuilder, Partials } = require("discord.js");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const beautify = require("./beautify.js");

const TOKEN = "YOUR_BOT_TOKEN_HERE";
const PREFIX = "!";
const DOT_PREFIX = ".";
const MOONSEC_PATH = path.join(__dirname, "MoonsecDeobfuscator", "MoonsecDeobfuscator.exe");
const UNLUAC_PATH = path.join(__dirname, "unluac.jar");
const TIMEOUT = 60000;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel
    ]
});

if (!fs.existsSync("temp")) fs.mkdirSync("temp");

function GenerateId(len) {
    len = len || 8;
    var chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    var result = "";
    for (var i = 0; i < len; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

function Cleanup() {
    var files = Array.from(arguments);
    for (var i = 0; i < files.length; i++) {
        try {
            if (fs.existsSync(files[i])) fs.unlinkSync(files[i]);
        } catch (e) {}
    }
}

function DownloadFile(url) {
    return new Promise(function(resolve, reject) {
        var lib = url.startsWith("https") ? https : http;
        lib.get(url, function(res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                DownloadFile(res.headers.location).then(resolve).catch(reject);
                return;
            }
            var data = "";
            res.on("data", function(chunk) { data += chunk; });
            res.on("end", function() { resolve(data); });
            res.on("error", function(e) { reject(e); });
        }).on("error", function(e) { reject(e); });
    });
}

function DeobfuscateMoonsec(script, options) {
    options = options || {};

    var id = GenerateId(8);
    var inputFile = path.join(__dirname, "input_moonsec_" + id + ".lua");
    var bytecodeFile = path.join(__dirname, "bytecode_moonsec_" + id + ".luac");
    var sourceFile = path.join(__dirname, "source_moonsec_" + id + ".lua");

    fs.writeFileSync(inputFile, script);

    // Step 1: Get bytecode from Moonsec deobfuscator
    var cmd = '"' + MOONSEC_PATH + '"' +
        ' -dev' +
        ' -i "' + inputFile + '"' +
        ' -o "' + bytecodeFile + '"';

    console.log("Running Moonsec: " + cmd);

    return new Promise(function(resolve, reject) {
        var child = exec(cmd, { maxBuffer: 1024 * 1024 * 50 }, function(error, stdout, stderr) {
            console.log("Moonsec Stdout: " + stdout);
            if (stderr) console.log("Moonsec Stderr: " + stderr);

            if (!fs.existsSync(bytecodeFile)) {
                Cleanup(inputFile, bytecodeFile, sourceFile);
                var errMsg = stderr || stdout || error?.message || "Failed to create bytecode";
                reject(new Error(errMsg));
                return;
            }

            // Step 2: Use unluac to decompile bytecode to Lua source
            var decompCmd = 'java -jar "' + UNLUAC_PATH + '" "' + bytecodeFile + '" > "' + sourceFile + '"';
            console.log("Running unluac: " + decompCmd);

            var decompTimer = setTimeout(function() {
                Cleanup(inputFile, bytecodeFile, sourceFile);
                reject(new Error("Decompilation timed out after " + (TIMEOUT / 1000) + " seconds."));
            }, TIMEOUT);

            exec(decompCmd, { maxBuffer: 1024 * 1024 * 50 }, function(decompErr, decompOut, decompStderr) {
                clearTimeout(decompTimer);

                if (fs.existsSync(sourceFile)) {
                    var output = fs.readFileSync(sourceFile, "utf-8");
                    
                    // Apply beautification
                    try {
                        output = beautify.BeautifyLua(output);
                    } catch (beautifyErr) {
                        console.log("Beautification error (using raw output): " + beautifyErr.message);
                    }
                    
                    Cleanup(inputFile, bytecodeFile, sourceFile);
                    resolve(output);
                } else {
                    Cleanup(inputFile, bytecodeFile, sourceFile);
                    reject(new Error(decompStderr || "Failed to decompile bytecode - no source file created"));
                }
            });
        });

        var timer = setTimeout(function() {
            try { child.kill(); } catch(e) {}
            Cleanup(inputFile, bytecodeFile, sourceFile);
            reject(new Error("Timed out after " + (TIMEOUT / 1000) + " seconds."));
        }, TIMEOUT);
    });
}

client.on("ready", function() {
    console.log("");
    console.log("================================");
    console.log("Moonsec Deobfuscator Bot is online as " + client.user.tag);
    console.log("================================");
    console.log("MoonsecDeobfuscator exists: " + fs.existsSync(MOONSEC_PATH));
    console.log("unluac.jar exists: " + fs.existsSync(UNLUAC_PATH));
    console.log("beautify.js exists: " + fs.existsSync(path.join(__dirname, "beautify.js")));
    console.log("Prefix: " + PREFIX);
    console.log("Dot Prefix: " + DOT_PREFIX);
    console.log("Servers: " + client.guilds.cache.size);
    console.log("================================");
    console.log("Ready to deobfuscate Moonsec V3 scripts!");
    console.log("");
});

client.on("messageCreate", async function(message) {
    if (message.author.bot) return;
    if (!message.content) return;

    var content = message.content.trim();
    var contentLower = content.toLowerCase();

    console.log("[" + new Date().toLocaleTimeString() + "] Message from " + message.author.tag + ": " + content.substring(0, 100));

    if (contentLower === PREFIX + "ping") {
        console.log("Ping command received");
        try {
            var latency = Date.now() - message.createdTimestamp;
            var moonsecExists = fs.existsSync(MOONSEC_PATH);
            var unluacExists = fs.existsSync(UNLUAC_PATH);

            var embed = new EmbedBuilder()
                .setTitle("Moonsec Deobfuscator - Status")
                .addFields(
                    { name: "Bot Latency", value: latency + "ms", inline: true },
                    { name: "Moonsec Deobf", value: moonsecExists ? "✅ Ready" : "❌ Not Found", inline: true },
                    { name: "unluac", value: unluacExists ? "✅ Ready" : "❌ Not Found", inline: true }
                )
                .setColor(0x00FF00)
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            console.log("Ping reply sent - " + latency + "ms");
        } catch (e) {
            console.log("Error sending ping: " + e.message);
            try {
                await message.reply("pong! " + (Date.now() - message.createdTimestamp) + "ms");
            } catch(e2) {
                console.log("Failed to send any reply: " + e2.message);
            }
        }
        return;
    }

    if (contentLower === PREFIX + "help") {
        console.log("Help command received");
        try {
            var embed = new EmbedBuilder()
                .setTitle("🌙 Moonsec Deobfuscator Bot")
                .setDescription("A standalone bot for deobfuscating MoonSec V3 scripts to Lua source code.")
                .addFields(
                    {
                        name: "Commands",
                        value: "`.deob` / `.deobfuscate` - Deobfuscate a MoonSec V3 script\n`!help` - Show this message\n`!ping` - Check bot status"
                    },
                    {
                        name: "How to Use",
                        value: "**Method 1:** Attach a `.lua` file and type `.deob`\n**Method 2:** Put code in a code block:\n`.deob`\n```lua\nyour code here\n```"
                    },
                    {
                        name: "Output",
                        value: "Decompiles to Lua source code using unluac + beautification"
                    },
                    {
                        name: "Requirements",
                        value: "• Java (for unluac)\n• MoonsecDeobfuscator.exe\n• unluac.jar\n• beautify.js"
                    }
                )
                .setColor(0x5865F2)
                .setFooter({ text: "Moonsec Deobfuscator | Powered by unluac" })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            console.log("Help reply sent");
        } catch (e) {
            console.log("Error sending help: " + e.message);
            try {
                await message.reply("**Commands:**\n`.deob` - Deobfuscate Moonsec V3 script\n`!help` - Show help\n`!ping` - Check status");
            } catch(e2) {
                console.log("Failed to send any reply: " + e2.message);
            }
        }
        return;
    }

    if (contentLower.startsWith(DOT_PREFIX + "deob") || contentLower.startsWith(DOT_PREFIX + "deobfuscate")) {
        console.log("Moonsec deob command received from " + message.author.tag);

        if (!fs.existsSync(MOONSEC_PATH)) {
            try {
                await message.reply("❌ MoonsecDeobfuscator.exe not found! Please check the installation.");
            } catch(e) {}
            return;
        }

        if (!fs.existsSync(UNLUAC_PATH)) {
            try {
                await message.reply("❌ unluac.jar not found! Please ensure Java decompiler is present.");
            } catch(e) {}
            return;
        }

        var attachment = message.attachments.first();
        var script = null;

        if (attachment) {
            console.log("Attachment found: " + attachment.name + " (" + attachment.size + " bytes)");

            if (attachment.size > 500000) {
                try {
                    await message.reply("❌ File too large! Maximum size is 500KB. Your file is " + (attachment.size / 1024).toFixed(1) + "KB");
                } catch(e) {}
                return;
            }

            try {
                script = await DownloadFile(attachment.url);
                console.log("Downloaded " + script.length + " chars from attachment");
            } catch (e) {
                console.log("Download error: " + e.message);
                try {
                    await message.reply("❌ Failed to download attachment: " + e.message);
                } catch(e2) {}
                return;
            }
        } else {
            var match = content.match(/```(?:lua|luau)?\n?([\s\S]+?)```/);
            if (match) {
                script = match[1];
                console.log("Code block found: " + script.length + " chars");
            }
        }

        if (!script || script.trim().length === 0) {
            console.log("No script provided");
            try {
                var embed = new EmbedBuilder()
                    .setTitle("🌙 Moonsec Deobfuscator")
                    .setDescription("**No script provided!**\n\nDeobfuscates MoonSec V3 scripts to Lua source code.")
                    .addFields(
                        {
                            name: "📎 Option 1 - Attach File",
                            value: "Upload a `.lua` file and type `.deob`"
                        },
                        {
                            name: "📝 Option 2 - Code Block",
                            value: "Type `.deob` with a code block:\n```lua\nyour code here\n```"
                        }
                    )
                    .setColor(0xFF9900);
                await message.reply({ embeds: [embed] });
            } catch (e) {
                try {
                    await message.reply("❌ No script provided.\n\n**Usage:**\n`.deob` with a `.lua` file attached\nOR\n`.deob` with code in a ```lua code block```");
                } catch(e2) {}
            }
            return;
        }

        var processing = null;
        try {
            processing = await message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("⏳ Processing with Moonsec Deobfuscator...")
                        .setDescription(
                            "Deobfuscating your MoonSec V3 script...\n\n" +
                            "**Step 1:** Moonsec deobfuscation\n" +
                            "**Step 2:** unluac decompilation\n" +
                            "**Step 3:** Beautification\n\n" +
                            "**Input size:** " + script.length + " chars\n" +
                            "**Timeout:** " + (TIMEOUT / 1000) + " seconds"
                        )
                        .setColor(0xFFFF00)
                        .setTimestamp()
                ]
            });
        } catch (e) {
            try {
                processing = await message.reply("⏳ Processing your script...");
            } catch(e2) {
                console.log("Cannot reply at all: " + e2.message);
                return;
            }
        }

        try {
            var startTime = Date.now();
            var output = await DeobfuscateMoonsec(script);
            var timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log("Moonsec deobfuscation complete in " + timeTaken + "s | Output: " + (output ? output.length : 0) + " chars");

            if (!output || output.length === 0) {
                throw new Error("Deobfuscation produced no output.");
            }

            var successEmbed = new EmbedBuilder()
                .setTitle("✅ Moonsec Deobfuscation Complete")
                .addFields(
                    { name: "⏱️ Time", value: timeTaken + "s", inline: true },
                    { name: "📥 Input", value: script.length + " chars", inline: true },
                    { name: "📤 Output", value: (output ? output.length : 0) + " chars", inline: true }
                )
                .setColor(0x00FF00)
                .setFooter({ text: "Moonsec Deobfuscator | unluac | beautified" })
                .setTimestamp();

            // Output is Lua source code
            if (output.length <= 1900) {
                try {
                    await processing.edit({
                        content: "```lua\n" + output + "\n```",
                        embeds: [successEmbed]
                    });
                } catch (e) {
                    console.log("Error editing with code: " + e.message);
                    try {
                        await processing.edit({
                            content: "```lua\n" + output.substring(0, 1800) + "\n...```",
                            embeds: [successEmbed]
                        });
                    } catch(e2) {}
                }
            } else {
                try {
                    var buffer = Buffer.from(output, "utf-8");
                    var file = new AttachmentBuilder(buffer, { name: "deobfuscated_moonsec.lua" });
                    await processing.edit({
                        content: "",
                        embeds: [successEmbed],
                        files: [file]
                    });
                } catch (e) {
                    console.log("Error sending file: " + e.message);
                    try {
                        var buffer2 = Buffer.from(output, "utf-8");
                        var file2 = new AttachmentBuilder(buffer2, { name: "deobfuscated_moonsec.lua" });
                        await processing.edit({
                            content: "✅ Done in " + timeTaken + "s",
                            files: [file2]
                        });
                    } catch(e2) {
                        try {
                            await processing.edit("✅ Done in " + timeTaken + "s but output too large to send (" + output.length + " chars)");
                        } catch(e3) {}
                    }
                }
            }
        } catch (e) {
            console.log("Moonsec deobfuscation error: " + e.message);

            var errorMsg = e.message || "Unknown error";
            errorMsg = errorMsg.replace(/\x1b\[[0-9;]*m/g, "");
            errorMsg = errorMsg.replace(/C:\\[^\s:]+/g, "[path]");
            if (errorMsg.length > 800) errorMsg = errorMsg.substring(0, 800) + "\n...";

            var tips = "• Make sure the script is obfuscated with MoonSec V3\n• Ensure the script is valid Lua\n• Java is required for unluac decompilation";

            if (errorMsg.includes("not found") || errorMsg.includes("ENOENT")) {
                tips = "• MoonsecDeobfuscator.exe not found\n• Make sure all files are in the correct folder";
            } else if (errorMsg.includes("java") || errorMsg.includes("java.exe")) {
                tips = "• Java is not installed or not in PATH\n• Install Java to use unluac decompilation\n• Download from: https://www.java.com/download/";
            }

            try {
                var errorEmbed = new EmbedBuilder()
                    .setTitle("❌ Moonsec Deobfuscation Failed")
                    .setDescription("```\n" + errorMsg + "\n```")
                    .addFields(
                        { name: "💡 Tips", value: tips },
                        { name: "📥 Input Size", value: script.length + " chars", inline: true }
                    )
                    .setColor(0xFF0000)
                    .setTimestamp();

                await processing.edit({ content: "", embeds: [errorEmbed] });
            } catch (e2) {
                console.log("Error sending error embed: " + e2.message);
                try {
                    await processing.edit("❌ Failed: " + errorMsg.substring(0, 400));
                } catch(e3) {}
            }
        }
        return;
    }
});

client.on("error", function(e) {
    console.log("[ERROR] Bot error: " + e.message);
});

process.on("unhandledRejection", function(e) {
    console.log("[ERROR] Unhandled rejection: " + e);
});

process.on("uncaughtException", function(e) {
    console.log("[ERROR] Uncaught exception: " + e.message);
});

console.log("Starting Moonsec Deobfuscator Bot...");
console.log("Checking files...");
console.log("  MoonsecDeobfuscator.exe: " + (fs.existsSync(MOONSEC_PATH) ? "FOUND" : "NOT FOUND"));
console.log("  unluac.jar: " + (fs.existsSync(UNLUAC_PATH) ? "FOUND" : "NOT FOUND"));
console.log("  beautify.js: " + (fs.existsSync(path.join(__dirname, "beautify.js")) ? "FOUND" : "NOT FOUND"));
console.log("");

if (!fs.existsSync(MOONSEC_PATH)) {
    console.log("ERROR: MoonsecDeobfuscator.exe not found at " + MOONSEC_PATH);
    console.log("Make sure the MoonsecDeobfuscator folder is present!");
    process.exit(1);
}

if (!fs.existsSync(UNLUAC_PATH)) {
    console.log("ERROR: unluac.jar not found at " + UNLUAC_PATH);
    console.log("Copy unluac.jar to the bot folder!");
    process.exit(1);
}

client.login(TOKEN).catch(function(e) {
    console.log("");
    console.log("================================");
    console.log("FAILED TO LOGIN!");
    console.log("Error: " + e.message);
    console.log("");
    console.log("Make sure you:");
    console.log("1. Put your real bot token in bot.js");
    console.log("2. The token is correct and not expired");
    console.log("3. The bot is not disabled in Discord Developer Portal");
    console.log("4. MESSAGE CONTENT INTENT is enabled");
    console.log("================================");
    process.exit(1);
});
