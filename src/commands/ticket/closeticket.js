const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");
const closeTicketChannel = require("../../utils/closeTicketChannel");

module.exports = {
    permission: "staff",

    data: new SlashCommandBuilder()
        .setName("closeticket")
        .setDescription("Close the current ticket."),

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
                content: "This command can only be used inside a ticket."
            });
        }

        if (ticket.status === "closed") {
            return interaction.editReply({
                content: "This ticket is already closed."
            });
        }

        await closeTicketChannel(
            interaction.channel,
            interaction.guild,
            ticket,
            interaction.user.id
        );

        return interaction.editReply({
            content: "Ticket closed."
        });

    }
};