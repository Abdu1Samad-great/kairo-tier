const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const supabase = require("../../database/supabase");
const updatePanel = require("../../utils/panelManager");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("editdescription")
        .setDescription("Edit the ticket panel description."),

    async execute(interaction) {

        if (!interaction.deferred && !interaction.replied) {
            await interaction.reply({
                content:
                    "<:developer:1533542330257375452> **Send the new panel description in this channel.**\n\nType `cancel` to cancel.\nYou have **60 seconds.**",
                ephemeral: true
            });
        }

        const filter = (m) => m.author.id === interaction.user.id;

        const collector = interaction.channel.createMessageCollector({
            filter,
            max: 1,
            time: 60000
        });

        collector.on("collect", async (message) => {

            if (message.content.toLowerCase() === "cancel") {
                await message.delete().catch(() => {});

                return interaction.followUp({
                    content: "<:Cross:1558553359642918952> Description edit cancelled.",
                    ephemeral: true
                });
            }

            const { data: settings } = await supabase
                .from("ticket_settings")
                .select("*")
                .eq("guild_id", interaction.guild.id)
                .single();

            if (!settings) {
                return interaction.followUp({
                    content: "<:Cross:1558553359642918952> Run /setupticket first.",
                    ephemeral: true
                });
            }

            await supabase
                .from("ticket_settings")
                .update({
                    description: message.content
                })
                .eq("guild_id", interaction.guild.id);

            await updatePanel(interaction.guild);

            await message.delete().catch(() => {});

            return interaction.followUp({
                content: "<:tick:1558554326887047228> Description updated successfully.",
                ephemeral: true
            });

        });

        collector.on("end", async (collected) => {
            if (collected.size === 0) {
                await interaction.followUp({
                    content: "<:Poll:1552279014767591516> You didn't send a description in time.",
                    ephemeral: true
                }).catch(() => {});
            }
        });
    }
};