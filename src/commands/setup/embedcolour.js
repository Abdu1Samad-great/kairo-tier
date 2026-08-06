const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    Colors,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("embedcolor")
        .setDescription("Change the ticket embed color.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addStringOption(option =>
            option
                .setName("color")
                .setDescription("Choose an embed color.")
                .setRequired(true)
                .addChoices(
                    { name: "🔴 Red", value: "Red" },
                    { name: "🔵 Blue", value: "Blue" },
                    { name: "🟢 Green", value: "Green" },
                    { name: "🟡 Yellow", value: "Yellow" },
                    { name: "🟣 Purple", value: "Purple" },
                    { name: "⚫ Black", value: "DarkButNotBlack" },
                    { name: "⚪ White", value: "White" },
                    { name: "🟠 Orange", value: "Orange" },
                    { name: "🟤 Gold", value: "Gold" },
                    { name: "🩷 Pink", value: "LuminousVividPink" },
                    { name: "🎲 Random", value: "Random" }
                )
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const color = interaction.options.getString("color");

        const { error } = await supabase
            .from("ticket_settings")
            .update({
                embed_color: color
            })
            .eq("guild_id", interaction.guild.id);

        if (error) {

            console.log(error);

            return interaction.editReply({
                content: "❌ Failed to update the embed color."
            });

        }

        const preview = new EmbedBuilder()
            .setColor(color === "Random" ? Colors.Random : Colors[color])
            .setTitle("✅ Embed Color Updated")
            .setDescription(`The default embed color has been changed to **${color}**.`);

        return interaction.editReply({
            embeds: [preview]
        });

    }
};