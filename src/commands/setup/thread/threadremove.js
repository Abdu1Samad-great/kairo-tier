const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("threadremove")
        .setDescription("Remove a user from the current private thread.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to remove")
                .setRequired(true)
        ),

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

        const user = interaction.options.getUser("user");

        try {

            await interaction.channel.members.remove(user.id);

            return interaction.editReply({
                content: `✅ ${user} has been removed from this thread.`
            });

        } catch (err) {

            console.error(err);

            return interaction.editReply({
                content: "❌ Failed to remove the user."
            });

        }

    }

};