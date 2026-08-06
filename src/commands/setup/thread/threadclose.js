const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("threadclose")
        .setDescription("Close the current private thread.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Check thread
        if (!interaction.channel.isThread()) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a thread."
            });
        }

        // Private thread only
        if (!interaction.channel.invitable) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a private thread."
            });
        }

        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("🔒 Thread Closed")
                    .setDescription(
                        `This thread has been closed by ${interaction.user}.`
                    )
                    .setTimestamp()
            ]
        });

        try {

            await interaction.channel.setLocked(true);

            await interaction.channel.setArchived(true);

            return interaction.editReply({
                content: "✅ Thread closed successfully."
            });

        } catch (err) {

            console.error(err);

            return interaction.editReply({
                content: "❌ Failed to close the thread."
            });

        }

    }

};