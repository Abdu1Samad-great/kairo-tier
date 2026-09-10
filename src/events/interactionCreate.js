const { MessageFlags } = require("discord.js");

const ticketModal = require("../handlers/ticketModal");
const ticketCreate = require("../handlers/ticketCreate");
const claimTicket = require("../handlers/claimTicket");
const unclaimTicket = require("../handlers/unclaimTicket");
const closeTicket = require("../handlers/closeTicket");
const confirmClose = require("../handlers/confirmClose");
const cancelClose = require("../handlers/cancelClose");

module.exports = {
    name: "interactionCreate",

    async execute(interaction, client) {

        // =========================
        // SLASH COMMANDS
        // =========================

        if (interaction.isChatInputCommand()) {

            const command = client.commands.get(
                interaction.commandName
            );

            if (!command) return;

            try {

                await command.execute(interaction);

            } catch (error) {

                console.error("COMMAND ERROR:", error);

                if (interaction.deferred || interaction.replied) {

                    await interaction.editReply({
                        content: "❌ An error occurred."
                    }).catch(() => {});

                } else {

                    await interaction.reply({
                        content: "❌ An error occurred.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});

                }

            }

            return;
        }

        // =========================
        // AUTOCOMPLETE
        // =========================

        if (interaction.isAutocomplete()) {

            const command = client.commands.get(
                interaction.commandName
            );

            if (!command || !command.autocomplete) return;

            try {

                await command.autocomplete(interaction);

            } catch (error) {

                console.error(
                    "AUTOCOMPLETE ERROR:",
                    error
                );

            }

            return;
        }

        // =========================
        // BUTTONS
        // =========================

        if (interaction.isButton()) {

            try {

                if (
                    interaction.customId.startsWith("ticket_")
                ) {
                    return await ticketCreate(interaction);
                }

                if (
                    interaction.customId === "claim"
                ) {
                    return await claimTicket(interaction);
                }

                if (
                    interaction.customId === "unclaim"
                ) {
                    return await unclaimTicket(interaction);
                }

                if (
                    interaction.customId === "close"
                ) {
                    return await closeTicket(interaction);
                }

                if (
                    interaction.customId === "confirm_close"
                ) {
                    return await confirmClose(interaction);
                }

                if (
                    interaction.customId === "cancel_close"
                ) {
                    return await cancelClose(interaction);
                }

            } catch (error) {

                console.error(
                    "BUTTON ERROR:",
                    error
                );

                if (
                    !interaction.deferred &&
                    !interaction.replied
                ) {

                    await interaction.reply({
                        content: "❌ An error occurred.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});

                } else {

                    await interaction.followUp({
                        content: "❌ An error occurred.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});

                }

            }

            return;
        }

        // =========================
        // MODAL SUBMIT
        // =========================

        if (interaction.isModalSubmit()) {

            try {

                if (
                    interaction.customId.startsWith(
                        "ticket_modal_"
                    )
                ) {

                    return await ticketModal(interaction);

                }

            } catch (error) {

                console.error(
                    "MODAL ERROR:",
                    error
                );

                if (
                    !interaction.deferred &&
                    !interaction.replied
                ) {

                    await interaction.reply({
                        content: "❌ " + error.message,
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});

                } else {

                    await interaction.editReply({
                        content: "❌ " + error.message
                    }).catch(() => {});

                }

            }

            return;
        }

    }
};