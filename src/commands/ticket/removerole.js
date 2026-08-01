const {
    SlashCommandBuilder,
    ChannelType,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("removerole")
        .setDescription("Remove a role from the current ticket.")
        .addRoleOption(option =>
            option
                .setName("role")
                .setDescription("Role to remove")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "❌ This command can only be used inside a ticket."
            });
        }

        const role = interaction.options.getRole("role");

        await interaction.channel.permissionOverwrites.delete(role.id).catch(() => {});

        const vc = interaction.guild.channels.cache.find(c =>
            c.parentId === interaction.channel.parentId &&
            c.name === interaction.channel.name &&
            c.type === ChannelType.GuildVoice
        );

        if (vc) {
            await vc.permissionOverwrites.delete(role.id).catch(() => {});
        }

        return interaction.editReply({
            content: `✅ ${role} has been removed from this ticket.`
        });

    }
};