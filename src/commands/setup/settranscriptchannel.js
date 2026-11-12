const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    MessageFlags
} = require("discord.js");

const supabase = require("../../database/supabase");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("settranscriptchannel")
        .setDescription("Set the transcript channel.")

        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("Transcript Channel")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        const channel = interaction.options.getChannel("channel");

        const { error } = await supabase
            .from("ticket_settings")
            .update({
                transcript_channel: channel.id
            })
            .eq("guild_id", interaction.guild.id);

        if (error) {
            console.log(error);

            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Failed to save transcript channel."
            });
        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Transcript channel set to ${channel}.`
        });

    }
};