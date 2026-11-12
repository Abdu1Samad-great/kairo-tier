const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "owner",
    data: new SlashCommandBuilder()
        .setName("rename")
        .setDescription("Rename the current ticket.")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("New ticket name")
                .setRequired(true)
        ),

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

        let newName = interaction.options.getString("name")
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");

        const match = interaction.channel.name.match(/(\d+)$/);

        if (match) {
            newName += `-${match[1]}`;
        }

        await interaction.channel.setName(newName);

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Ticket renamed to **${newName}**`
        });

    }
};
