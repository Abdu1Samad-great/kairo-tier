const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

const supabase = require("../../database/supabase");
const updatePanel = require("../../utils/panelManager");

module.exports = {
    permission: "admin",
    data: new SlashCommandBuilder()
        .setName("removebutton")
        .setDescription("Remove a ticket button.")

        .addStringOption(option =>
            option
                .setName("label")
                .setDescription("Button label to remove")
                .setRequired(true)
        ),

    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        const label = interaction.options.getString("label");

        const { data: button, error } = await supabase
            .from("ticket_buttons")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .ilike("label", label)
            .single();

        if (error || !button) {
            return interaction.editReply({
                content: "<:Cross:1558553359642918952> No button found with that label."
            });
        }

        const { error: deleteError } = await supabase
            .from("ticket_buttons")
            .delete()
            .eq("id", button.id);

        if (deleteError) {
            console.log(deleteError);

            return interaction.editReply({
                content: "<:Cross:1558553359642918952> Failed to remove button."
            });
        }

        const { data: buttons } = await supabase
            .from("ticket_buttons")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .order("order_number");

        if (buttons) {
            for (let i = 0; i < buttons.length; i++) {
                await supabase
                    .from("ticket_buttons")
                    .update({
                        order_number: i + 1
                    })
                    .eq("id", buttons[i].id);
            }
        }

        await updatePanel(interaction.guild);

        return interaction.editReply({
            content: `<:tick:1558554326887047228> Button **${button.label}** has been removed successfully.`
        });

    }
};
