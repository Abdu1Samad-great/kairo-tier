const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    ChannelType
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("threadadd")
        .setDescription("Add a user to the current private thread.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)

        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to add")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        if (!interaction.channel.isThread()) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a thread."
            });
        }

        if (interaction.channel.type !== ChannelType.PrivateThread) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a private thread."
            });
        }

        const user = interaction.options.getUser("user");

        try {

            const member = await interaction.guild.members.fetch(user.id);

            await interaction.channel.members.add(member.id);

            return interaction.editReply({
                content: `✅ ${member} has been added to the thread.`
            });

        } catch (err) {

            console.error(err);

            return interaction.editReply({
                content: `❌ Discord denied access.\nError: ${err.code}`
            });

        }

    }

};