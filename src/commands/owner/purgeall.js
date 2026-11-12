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
        .setName("purgeall")
        .setDescription("Purge all closed tickets."),

    async execute(interaction) {

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // Settings
        const { data: settings } = await supabase
            .from("ticket_settings")
            .select("owner_role, transcript_channel, closed_category")
            .eq("guild_id", interaction.guild.id)
            .single();


        if (!settings.closed_category) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Closed ticket category is not configured."
            });
        }

        const closedCategory = interaction.guild.channels.cache.get(
            settings.closed_category
        );

        if (!closedCategory) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Closed ticket category not found."
            });
        }

        const tickets = closedCategory.children.cache.filter(
            c => c.type === ChannelType.GuildText
        );

        if (tickets.size === 0) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> No closed tickets found."
            });
        }

        let purged = 0;

        for (const [, channel] of tickets) {

            try {

                const transcript =
                    await discordTranscripts.createTranscript(channel, {
                        filename: `${channel.name}.html`,
                        saveImages: true,
                        poweredBy: false
                    });

                if (settings.transcript_channel) {

                    const logChannel =
                        interaction.guild.channels.cache.get(
                            settings.transcript_channel
                        );

                    if (logChannel) {

                        await logChannel.send({
                            content: `📄 Transcript for **${channel.name}**`,
                            files: [transcript]
                        });

                    }

                }

                const vc = interaction.guild.channels.cache.find(c =>
                    c.parentId === channel.parentId &&
                    c.name === channel.name &&
                    c.type === ChannelType.GuildVoice
                );

                if (vc) {
                    await vc.delete().catch(() => {});
                }

                await supabase
                    .from("tickets")
                    .delete()
                    .eq("channel_id", channel.id);

                await channel.delete().catch(() => {});

                purged++;

            } catch (err) {

                console.log(`Failed to purge ${channel.name}`);
                console.error(err);

            }

        }

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Successfully purged **${purged}** closed ticket(s).`
        });

    }
};
