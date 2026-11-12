const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "staff",
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a user from the current ticket.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("User to remove")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> This command can only be used inside a ticket."
            });
        }

        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (!settings) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Ticket system is not configured."
            });
        }


        const user = interaction.options.getUser("user");

        // Don't remove ticket owner
        if (user.id === ticket.owner_id) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> You cannot remove the ticket owner."
            });
        }

        await interaction.channel.permissionOverwrites.delete(user.id).catch(() => {});

        const vc = interaction.guild.channels.cache.find(
            c =>
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name &&
                c.isVoiceBased()
        );

        if (vc) {
            await vc.permissionOverwrites.delete(user.id).catch(() => {});
        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> ${user} has been removed from this ticket.`
        });

    }
};
