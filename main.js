const Discord = require('discord.js');

const client = new Discord.Client();

const userToken = '[USER TOKEN GOES HERE]';

let arvanBot;

/**
 *  Application entry point, event fired when a connection is established
 */ 
client.on('ready', () => {    
    let arvanBot = new Bot();

    setInterval(() => {
        arvanBot.logicTick();
    }, 1000);

    // Receive messages:
    client.on('message', message => {
        if(message.content[0] === '!' && message.channel.name == 'writing_sprint') {
            let tokens = message.content.substring(1).split(" ");
            arvanBot.processCommand(tokens);
        }
    });
});

client.login(userToken);

