require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];

const commandsPath = path.join(__dirname, "src", "commands");
const folders = fs.readdirSync(commandsPath);

for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);

    const files = fs.readdirSync(folderPath).filter(file => file.endsWith(".js"));

    for (const file of files) {
        const command = require(path.join(folderPath, file));

        if (!command.data || !command.execute) {
            console.log(`❌ Invalid command file: ${folder}/${file}`);
            continue;
        }

        commands.push(command.data.toJSON());
        console.log(`✅ Loaded: ${command.data.name}`);
    }
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log("🚀 Deploying commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log("✅ Commands deployed!");
    } catch (err) {
        console.error(err);
    }
})();