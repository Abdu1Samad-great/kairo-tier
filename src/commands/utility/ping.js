const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    permission: "user",
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),

    async execute(interaction) {
        await interaction.reply("🏓 Pong!");
    },
};