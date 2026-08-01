const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");

const supabase = require("../database/supabase");

module.exports = async function updatePanel(guild) {

    // Get Settings
    const { data: settings, error: settingsError } = await supabase
        .from("ticket_settings")
        .select("*")
        .eq("guild_id", guild.id)
        .single();

    if (settingsError || !settings) {
        console.log("No ticket settings found.");
        return;
    }

    // Get Buttons
    const { data: buttons, error: buttonsError } = await supabase
        .from("ticket_buttons")
        .select("*")
        .eq("guild_id", guild.id)
        .order("order_number", { ascending: true });

    if (buttonsError) {
        console.log(buttonsError);
        return;
    }

    // Get Panel Channel
    const channel = guild.channels.cache.get(settings.panel_channel);

    if (!channel) {
        console.log("Panel channel not found.");
        return;
    }

    // Create Embed
    const embed = new EmbedBuilder()
        .setColor("#e11d48")
        .setTitle(settings.header || "Support Center")
        .setDescription(settings.description || "Choose a category below.");

    // Create Buttons
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let count = 0;

    for (const button of buttons) {

        let style = ButtonStyle.Primary;

        switch (button.style) {
            case "Secondary":
                style = ButtonStyle.Secondary;
                break;

            case "Success":
                style = ButtonStyle.Success;
                break;

            case "Danger":
                style = ButtonStyle.Danger;
                break;

            default:
                style = ButtonStyle.Primary;
        }

        const btn = new ButtonBuilder()
            .setCustomId(`ticket_${button.id}`)
            .setLabel(button.label)
            .setStyle(style);

        if (button.emoji) {
            btn.setEmoji(button.emoji);
        }

        currentRow.addComponents(btn);
        count++;

        if (count === 3) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
            count = 0;
        }
    }

    if (count > 0) {
        rows.push(currentRow);
    }

    let message = null;

    // Try editing existing panel
    try {

        if (settings.message_id) {

            message = await channel.messages.fetch(settings.message_id);

            await message.edit({
                embeds: [embed],
                components: rows
            });

        }

    } catch {

        console.log("Old panel deleted. Creating a new one...");

    }

    // Create new panel if needed
    if (!message) {

        message = await channel.send({
            embeds: [embed],
            components: rows
        });

        await supabase
            .from("ticket_settings")
            .update({
                message_id: message.id
            })
            .eq("guild_id", guild.id);

    }

    console.log(`✅ Panel Updated (${buttons.length} Buttons)`);

};