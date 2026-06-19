console.log("DEPLOY STARTED...");

require('dotenv').config();

const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const commands = [
    {
        name: 'setuppanel',
        description: 'Setup registration panel'
    },
    {
        name: 'info',
        description: 'Show user data',
        options: [
            {
                name: 'user',
                description: 'Select a user',
                type: 6,
                required: false
            }
        ]
    },
    {
        name: 'staff-promote',
        description: 'Promote a staff member',
        options: [
            {
                name: 'user',
                description: 'Target user',
                type: 6,
                required: true
            },
            {
                name: 'old_role',
                description: 'Old role',
                type: 8,
                required: true
            },
            {
                name: 'new_role',
                description: 'New role',
                type: 8,
                required: true
            }
        ]
    },
    {
        name: 'staff-demote',
        description: 'Demote a staff member',
        options: [
            {
                name: 'user',
                description: 'Target user',
                type: 6,
                required: true
            },
            {
                name: 'old_role',
                description: 'Old role',
                type: 8,
                required: true
            },
            {
                name: 'new_role',
                description: 'New role',
                type: 8,
                required: true
            }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Commands registered!');
    } catch (err) {
        console.error(err);
    }
})();