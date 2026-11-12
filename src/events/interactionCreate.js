const { MessageFlags } = require("discord.js");

const ticketModal = require("../handlers/ticketModal");
const ticketCreate = require("../handlers/ticketCreate");
const claimTicket = require("../handlers/claimTicket");
const unclaimTicket = require("../handlers/unclaimTicket");
const closeTicket = require("../handlers/closeTicket");
const confirmClose = require("../handlers/confirmClose");
const cancelClose = require("../handlers/cancelClose");

const { checkPermission } = require("../utils/permissions");

const BUTTON_PERMISSIONS = {
    claim: "staff",
    unclaim: "staff",
    close: "staff",
    confirm_close: "user",
    cancel_close: "user",
};

module.exports = {
    name: "interactionCreate",

    async execute(interaction, client) {

        if (interaction.isChatInputCommand()) {

            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            const required = command.permission || "user";

            if (!(await checkPermission(interaction, required))) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error("COMMAND ERROR:", error);

                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({
                        content: "An error occurred."
                    }).catch(() => {});
                } else {
                    await interaction.reply({
                        content: "An error occurred.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }
            }

            return;
        }

        if (interaction.isAutocomplete()) {

            const command = client.commands.get(interaction.commandName);

            if (!command || !command.autocomplete) return;

            const required = command.permission || "user";

            if (required !== "user") {
                const { meetsPermission, getSettings } = require("../utils/permissions");
                const settings = await getSettings(interaction.guild.id).catch(() => null);
                if (!meetsPermission(interaction.member, settings, required)) return;
            }

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error("AUTOCOMPLETE ERROR:", error);
            }

            return;
        }

        if (interaction.isButton()) {

            try {

                if (interaction.customId.startsWith("ticket_")) {
                    return await ticketCreate(interaction);
                }

                const permission = BUTTON_PERMISSIONS[interaction.customId];

                if (permission && permission !== "user") {
                    if (!(await checkPermission(interaction, permission))) return;
                }

                if (interaction.customId === "claim") {
                    return await claimTicket(interaction);
                }

                if (interaction.customId === "unclaim") {
                    return await unclaimTicket(interaction);
                }

                if (interaction.customId === "close") {
                    return await closeTicket(interaction);
                }

                if (interaction.customId === "confirm_close") {
                    return await confirmClose(interaction);
                }

                if (interaction.customId === "cancel_close") {
                    return await cancelClose(interaction);
                }

            } catch (error) {

                console.error("BUTTON ERROR:", error);

                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({
                        content: "An error occurred.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                } else {
                    await interaction.followUp({
                        content: "An error occurred.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                }

            }

            return;
        }

        if (interaction.isModalSubmit()) {

            try {

                if (interaction.customId.startsWith("ticket_modal_")) {
                    return await ticketModal(interaction);
                }

            } catch (error) {

                console.error("MODAL ERROR:", error);

                if (!interaction.deferred && !interaction.replied) {
                    await interaction.reply({
                        content: "An error occurred.",
                        flags: MessageFlags.Ephemeral
                    }).catch(() => {});
                } else {
                    await interaction.editReply({
                        content: "An error occurred."
                    }).catch(() => {});
                }

            }

            return;
        }

    }
};