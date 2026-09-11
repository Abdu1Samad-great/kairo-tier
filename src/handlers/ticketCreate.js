const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require("discord.js");

const supabase = require("../database/supabase");

module.exports = async (interaction) => {

    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("ticket_")) return;

    try {

        const buttonId = interaction.customId.replace("ticket_", "");

        const { data: button, error } = await supabase
            .from("ticket_buttons")
            .select("*")
            .eq("id", buttonId)
            .single();

        if (error || !button) {
            return interaction.reply({
                content: "❌ Invalid ticket button.",
                flags: MessageFlags.Ephemeral
            });
        }

        // =========================
        // QUESTIONS
        // =========================

        const { data: questions, error: questionError } = await supabase
            .from("ticket_questions")
            .select("*")
            .eq("button_id", button.id)
            .order("question_order");

        if (questionError) {
            console.error("QUESTION ERROR:", questionError);
        }

        // =========================
        // MODAL
        // =========================

        if (questions && questions.length > 0) {

            const modalQuestions = questions.slice(0, 5);

            const modal = new ModalBuilder()
                .setCustomId(`ticket_modal_${button.id}`)
                .setTitle(
                    button.label.length > 45
                        ? button.label.substring(0, 42) + "..."
                        : button.label
                );

            for (const q of modalQuestions) {

                const question = String(q.question || "Question");

                const label =
                    question.length > 45
                        ? question.substring(0, 42) + "..."
                        : question;

                const placeholder =
                    question.length > 100
                        ? question.substring(0, 97) + "..."
                        : question;

                const input = new TextInputBuilder()
                    .setCustomId(`q${q.question_order}`)
                    .setLabel(label)
                    .setPlaceholder(placeholder)
                    .setRequired(true)
                    .setStyle(
                        q.input_type === "paragraph"
                            ? TextInputStyle.Paragraph
                            : TextInputStyle.Short
                    );

                modal.addComponents(
                    new ActionRowBuilder().addComponents(input)
                );
            }

            return await interaction.showModal(modal);
        }

        // =========================
        // DEFER
        // =========================

        await interaction.deferReply({
            flags: MessageFlags.Ephemeral
        });

        // =========================
        // DISABLED
        // =========================

        if (button.disabled === true) {
            return interaction.editReply({
                content: "❌ This ticket category is currently closed."
            });
        }

        // =========================
        // SETTINGS
        // =========================

        const { data: settings, error: settingsError } = await supabase
            .from("ticket_settings")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        if (settingsError) {
            console.error("SETTINGS ERROR:", settingsError);
        }

        // =========================
        // BLACKLIST
        // =========================

        if (
            settings?.blacklist_role &&
            interaction.guild.roles.cache.has(settings.blacklist_role) &&
            interaction.member.roles.cache.has(settings.blacklist_role)
        ) {
            return interaction.editReply({
                content: "❌ You are blacklisted from creating tickets."
            });
        }

        // =========================
        // COUNTER
        // =========================

        const { data: counter } = await supabase
            .from("ticket_counter")
            .select("*")
            .eq("guild_id", interaction.guild.id)
            .single();

        let number = 1;

        if (counter) {

            number = counter.current + 1;

            await supabase
                .from("ticket_counter")
                .update({
                    current: number
                })
                .eq("guild_id", interaction.guild.id);

        } else {

            await supabase
                .from("ticket_counter")
                .insert({
                    guild_id: interaction.guild.id,
                    current: 1
                });
        }

        // =========================
        // CHANNEL NAME
        // =========================

        let cleanName = button.label
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/^-+|-+$/g, "");

        if (!cleanName) {
            cleanName = "ticket";
        }

        cleanName = cleanName.substring(0, 70);

        const ticketName =
            `${cleanName}-${String(number).padStart(4, "0")}`;

        // =========================
        // PERMISSIONS
        // =========================

        const overwrites = [

            {
                id: interaction.guild.roles.everyone.id,
                deny: [
                    PermissionFlagsBits.ViewChannel
                ]
            },

            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory
                ]
            }

        ];

        // =========================
        // STAFF ROLES
        // =========================

        if (Array.isArray(settings?.staff_roles)) {

            for (const roleId of settings.staff_roles) {

                // Make sure ID is a string
                const id = String(roleId).trim();

                // Check if role actually exists
                const role = interaction.guild.roles.cache.get(id);

                if (!role) {
                    console.log(
                        `⚠️ Skipping invalid/deleted staff role: ${id}`
                    );
                    continue;
                }

                overwrites.push({

                    id: role.id,

                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]

                });

            }

        }

        // =========================
        // CREATE CHANNEL
        // =========================

        const channel = await interaction.guild.channels.create({

            name: ticketName,

            type: ChannelType.GuildText,

            parent: button.category_id,

            topic: interaction.user.id,

            permissionOverwrites: overwrites

        });

        // =========================
        // EMBED
        // =========================

        const embed = new EmbedBuilder()

            .setColor(settings?.embed_color || "#e11d48")

            .setAuthor({
                name: interaction.guild.name,
                iconURL: interaction.guild.iconURL({
                    dynamic: true
                })
            })

            .setTitle("🎫 Support Ticket")

            .setDescription(
`Hey ${interaction.user}, thanks for opening a ticket. A staff member will be with you shortly.

**Opened By:** ${interaction.user}
**Category:** ${button.label}`
            )

            .setFooter({
                text: `Ticket #${String(number).padStart(4, "0")}`
            })

            .setTimestamp();

        // =========================
        // BUTTONS
        // =========================

        const row = new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("claim")
                    .setLabel("Claim")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("close")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger)

            );

        // =========================
        // SEND MESSAGE
        // =========================

        await channel.send({

            content: `<@${interaction.user.id}>`,

            embeds: [embed],

            components: [row]

        });

        // =========================
        // SAVE TICKET
        // =========================

        const { error: ticketError } = await supabase
            .from("tickets")
            .insert({

                guild_id: interaction.guild.id,

                channel_id: channel.id,

                owner_id: interaction.user.id,

                category: button.label,

                claimed_by: null,

                status: "open"

            });

        if (ticketError) {
            console.error(
                "TICKET DATABASE ERROR:",
                ticketError
            );
        }

        // =========================
        // SUCCESS
        // =========================

        return interaction.editReply({

            content: `✅ Ticket Created: ${channel}`

        });

    } catch (error) {

        console.error(
            "TICKET CREATE ERROR:",
            error
        );

        if (
            interaction.deferred ||
            interaction.replied
        ) {

            return interaction.editReply({

                content:
                    `❌ Something went wrong while creating the ticket.\n\`${error.message}\``

            }).catch(() => {});

        }

        return interaction.reply({

            content:
                `❌ Something went wrong while creating the ticket.\n\`${error.message}\``,

            flags: MessageFlags.Ephemeral

        }).catch(() => {});

    }

};