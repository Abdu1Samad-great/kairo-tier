const {
    SlashCommandBuilder,
    MessageFlags,
    ChannelType
} = require("discord.js");

const discordTranscripts = require("discord-html-transcripts");
const supabase = require("../../database/supabase");

module.exports = {
    permission: "owner",
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Generate transcript and permanently delete this ticket."),

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

        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("owner_role, transcript_channel")
            .eq("guild_id", interaction.guild.id)
            .single();


        const transcript = await discordTranscripts.createTranscript(
            interaction.channel,
            {
                filename: `${interaction.channel.name}.html`,
                saveImages: true,
                poweredBy: false
            }
        );

        if (settings.transcript_channel) {

            const logChannel = interaction.guild.channels.cache.get(settings.transcript_channel);

            if (logChannel) {

                await logChannel.send({
                    content: `📄 Transcript for **${interaction.channel.name}**`,
                    files: [transcript]
                });

            }

        }

        const vc = interaction.guild.channels.cache.find(c =>
            c.parentId === interaction.channel.parentId &&
            c.name === interaction.channel.name &&
            c.type === ChannelType.GuildVoice
        );

        if (vc) {
            await vc.delete().catch(() => {});
        }

        await supabase
            .from("tickets")
            .delete()
            .eq("channel_id", interaction.channel.id);

        await interaction.editReply({
            content: "<:triall_staff:1533541983409274911> Ticket purged. Transcript has been saved."
        });

        setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
        }, 2000);

    }
};
