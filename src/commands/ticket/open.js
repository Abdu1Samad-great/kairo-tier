const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "staff",
    data: new SlashCommandBuilder()
        .setName("open")
        .setDescription("Reopen a closed ticket."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const { data: ticket } = await supabase
            .from("tickets")
            .select("*")
            .eq("channel_id", interaction.channel.id)
            .single();

        if (!ticket) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> This is not a ticket."
            });
        }

        if (ticket.status !== "closed") {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> This ticket is not closed."
            });
        }

        await interaction.channel.setParent(ticket.original_category);

        // Rename
        await interaction.channel.setName(
            interaction.channel.name.replace(/^closed-/, "")
        );

        await interaction.channel.permissionOverwrites.edit(ticket.owner_id, {
            SendMessages: true,
            ViewChannel: true,
            ReadMessageHistory: true
        });

await supabase
    .from("tickets")
    .update({
        status: "open",
        close_requested_by: null
    })
    .eq("channel_id", interaction.channel.id);

        const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("<:queue_open:1534872848705785937> Ticket Reopened")
            .setDescription(`This ticket has been reopened by ${interaction.user}.`);

        await interaction.channel.send({
            embeds: [embed]
        });

        return interaction.editReply({
            content: "<:tick:1558554326887047228> Ticket reopened."
        });

    }
};
