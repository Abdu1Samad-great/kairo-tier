require("dotenv").config();

const { Client, Collection, GatewayIntentBits } = require("discord.js");

const loadCommands = require("./handlers/commandHandler");
const loadEvents = require("./handlers/eventHandler");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.commands = new Collection();

loadCommands(client);
loadEvents(client);

client.once("clientReady", () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);