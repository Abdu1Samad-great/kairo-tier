const {
    SlashCommandBuilder,
    ChannelType
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "staff",
    data: new SlashCommandBuilder()
        .setName("deletevc")
        .setDescription("Delete the voice channel for the current ticket."),

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


        // Find VC
        const vc = interaction.guild.channels.cache.find(
            c =>
                c.type === ChannelType.GuildVoice &&
                c.parentId === interaction.channel.parentId &&
                c.name === interaction.channel.name
        );

        if (!vc) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> No voice channel exists for this ticket."
            });
        }

        await vc.delete("Ticket voice channel deleted");

        return interaction.editReply({
            content: "<:tick:1558554326887047228> Voice channel deleted successfully."
        });

    }
};
