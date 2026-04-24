# Moonsec Deobfuscator Bot

A standalone Discord bot for fucking moonsec v3 and getting its source code

## Features

- 🌙 MoonSec V3 deobfuscation
- ☕ unluac bytecode decompilation
- ✨ Beautified output with clean variable names
- 📎 File attachments or code block input
- 🚀 Fast processing with timeout protection

## Requirements

- Node.js (v16+)
- Java (for unluac)
- Discord Bot Token

## Installation

1. Install dependencies:
```bash
npm install
```

2. Edit `bot.js` and replace `YOUR_BOT_TOKEN_HERE` with your actual Discord bot token.

3. Run the bot:
```bash
node bot.js
```

Or use the start script:
```bash
start.bat
```

## Usage

**Command:** `.deob` or `.deobfuscate`

**Methods:**
1. Attach a `.lua` file and type `.deob`
2. Include code in a code block:
```
.deob
```lua
your obfuscated code here
```
```

## How It Works

1. **MoonsecDeobfuscator** extracts bytecode from MoonSec V3 obfuscated scripts
2. **unluac** decompiles the bytecode to readable Lua source code
3. **beautify.js** cleans up variable names and formats the output

## File Structure

```
MoonsecDeobfuscator-Bot/
├── bot.js              # Main bot file
├── beautify.js         # Lua beautification module
├── unluac.jar         # Java bytecode decompiler
├── package.json       # Dependencies
├── MoonsecDeobfuscator/  # Moonsec deobfuscator executable + DLLs
│   ├── MoonsecDeobfuscator.exe
│   └── ... (other required DLLs)
└── temp/              # Temporary files (auto-created)
```

## Commands

- `.deob` / `.deobfuscate` - Deobfuscate a MoonSec V3 script
- `!help` - Show help message
- `!ping` - Check bot status

## Troubleshooting

**"Java not found" error:**
- Install Java from https://www.java.com/download/
- Make sure Java is in your system PATH

**"MoonsecDeobfuscator.exe not found" error:**
- Make sure the `MoonsecDeobfuscator` folder is present with all DLLs

**"unluac.jar not found" error:**
- Make sure `unluac.jar` is in the bot folder

## Credits

- MoonsecDeobfuscator by tupsutumppu goat
- unluac - Lua 5.1 decompiler
- i made other shit

btw this full readme was AI made cus my ass was lazy

To Use:
Install Node.js (if not already installed): https://nodejs.org/
Install dependencies:
cd "yourdrive:\MoonsecDeobfuscator-Bot"
npm install
Add your bot token in bot.js:
const TOKEN = "YOUR_ACTUAL_BOT_TOKEN_HERE";
Run the bot:
Double-click start.bat OR
Run: node bot.js
command in discord:
.deob
