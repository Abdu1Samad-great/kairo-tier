const {
    SlashCommandBuilder,
    MessageFlags,
    ChannelType
} = require("discord.js");

const discordTranscripts = require("discord-html-transcripts");
const supabase = require("../../database/supabase");

module.exports = {
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

        if (
            !settings?.owner_role ||
            !interaction.member.roles.cache.has(settings.owner_role)
        ) {
            return interaction.editReply({
                content: "❌ Only the configured Owner Role can use this command."
            });
        }

        if (!settings.closed_category) {
            return interaction.editReply({
                content: "❌ Closed ticket category is not configured."
            });
        }

        const closedCategory = interaction.guild.channels.cache.get(
            settings.closed_category
        );

        if (!closedCategory) {
            return interaction.editReply({
                content: "❌ Closed ticket category not found."
            });
        }

        const tickets = closedCategory.children.cache.filter(
            c => c.type === ChannelType.GuildText
        );

        if (tickets.size === 0) {
            return interaction.editReply({
                content: "❌ No closed tickets found."
            });
        }

        let purged = 0;

        for (const [, channel] of tickets) {

            try {

                // Transcript
                const transcript =
                    await discordTranscripts.createTranscript(channel, {
                        filename: `${channel.name}.html`,
                        saveImages: true,
                        poweredBy: false
                    });

                // Send transcript
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

                // Delete linked VC
                const vc = interaction.guild.channels.cache.find(c =>
                    c.parentId === channel.parentId &&
                    c.name === channel.name &&
                    c.type === ChannelType.GuildVoice
                );

                if (vc) {
                    await vc.delete().catch(() => {});
                }

                // Remove DB entry
                await supabase
                    .from("tickets")
                    .delete()
                    .eq("channel_id", channel.id);

                // Delete channel
                await channel.delete().catch(() => {});

                purged++;

            } catch (err) {

                console.log(`Failed to purge ${channel.name}`);
                console.error(err);

            }

        }

        return interaction.editReply({
            content: `✅ Successfully purged **${purged}** closed ticket(s).`
        });

    }
};