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


        // ---------------- Slash Commands ----------------

        if (interaction.isChatInputCommand()) {

            const command = client.commands.get(interaction.commandName);

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
                        flags: 64
                    }).catch(() => {});

                }

            }

            return;
        }



        // ---------------- Autocomplete ----------------

        if (interaction.isAutocomplete()) {

            const command = client.commands.get(interaction.commandName);

            if (!command || !command.autocomplete) return;

            try {

                await command.autocomplete(interaction);

            } catch (error) {

                console.error("AUTOCOMPLETE ERROR:", error);

            }

            return;
        }



        // ---------------- Ticket Buttons ----------------

        if (interaction.isButton()) {

            try {

                if (interaction.customId.startsWith("ticket_")) {
                    return ticketCreate(interaction);
                }


                if (interaction.customId === "claim") {
                    return claimTicket(interaction);
                }


                if (interaction.customId === "unclaim") {
                    return unclaimTicket(interaction);
                }


                if (interaction.customId === "close") {
                    return closeTicket(interaction);
                }


                if (interaction.customId === "confirm_close") {
                    return confirmClose(interaction);
                }


                if (interaction.customId === "cancel_close") {
                    return cancelClose(interaction);
                }


            } catch (error) {

                console.error("BUTTON ERROR:", error);

            }

            return;
        }



        // ---------------- Ticket Modal Submit ----------------

        if (interaction.isModalSubmit()) {

            console.log("MODAL RECEIVED:", interaction.customId);

            try {

                if (interaction.customId.startsWith("ticket_modal_")) {

                    return ticketModal(interaction);

                }

            } catch (error) {
    console.error(error);

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
            content: "❌ " + error.message
        }).catch(() => {});
    } else {
        await interaction.reply({
            content: "❌ " + error.message,
            flags: 64
        }).catch(() => {});
    }
}

            return;
        }


    }
};