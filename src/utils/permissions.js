const { PermissionFlagsBits } = require("discord.js");
const supabase = require("../database/supabase");

async function getSettings(guildId) {
    const { data } = await supabase
        .from("ticket_settings")
        .select("*")
        .eq("guild_id", guildId)
        .single();

    return data || null;
}

function getStaffRoleIds(settings) {
    const ids = [];

    if (Array.isArray(settings?.staff_roles)) {
        ids.push(...settings.staff_roles);
    } else if (typeof settings?.staff_roles === "string") {
        try {
            const parsed = JSON.parse(settings.staff_roles);
            if (Array.isArray(parsed)) ids.push(...parsed);
        } catch {
            // Ignore invalid JSON and fall through.
        }
    }

    if (settings?.staff_role) {
        ids.push(settings.staff_role);
    }

    return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
}

function hasRole(member, roleId) {
    return Boolean(roleId) && member.roles.cache.has(String(roleId));
}

function hasStaffRole(member, settings) {
    return getStaffRoleIds(settings).some((id) => member.roles.cache.has(id));
}

function hasAdminRole(member, settings) {
    return hasRole(member, settings?.admin_role);
}

function hasOwnerRole(member, settings) {
    return hasRole(member, settings?.owner_role);
}

function isDiscordAdmin(member) {
    return Boolean(member?.permissions?.has?.(PermissionFlagsBits.Administrator));
}

function getAccessLevel(member, settings) {
    if (isDiscordAdmin(member) || hasOwnerRole(member, settings)) return 3;
    if (hasAdminRole(member, settings)) return 2;
    if (hasStaffRole(member, settings)) return 1;
    return 0;
}

const LEVELS = { user: 0, staff: 1, admin: 2, owner: 3 };

function meetsPermission(member, settings, required) {
    const requiredLevel = LEVELS[required] ?? 0;
    return getAccessLevel(member, settings) >= requiredLevel;
}

async function checkPermission(interaction, required) {
    if (!required || required === "user") return true;

    const settings = await getSettings(interaction.guild.id);

    if (meetsPermission(interaction.member, settings, required)) return true;

    const message = "You do not have permission to use this command.";

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: message }).catch(() => {});
    } else {
        await interaction.reply({ content: message, flags: 64 }).catch(() => {});
    }

    return false;
}

module.exports = {
    getSettings,
    getStaffRoleIds,
    hasStaffRole,
    hasAdminRole,
    hasOwnerRole,
    meetsPermission,
    checkPermission,
    LEVELS,
};