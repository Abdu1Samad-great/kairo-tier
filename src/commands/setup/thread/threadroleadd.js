const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags
} = require("discord.js");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("threadroleadd")
        .setDescription("Add every member of a role to the current private thread.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageThreads)

        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role to add")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Must be inside a thread
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

        const role = interaction.options.getRole("role");

        const members = role.members;

        if (!members.size) {
            return interaction.editReply({
                content: "❌ This role has no members."
            });
        }

        let added = 0;
        let failed = 0;

        for (const member of members.values()) {

            try {

                await interaction.channel.members.add(member.id);

                added++;

            } catch {

                failed++;

            }

        }

        return interaction.editReply({
            content:
`✅ Added **${added}** member(s) from ${role}.
❌ Failed: **${failed}**`
        });

    }

};