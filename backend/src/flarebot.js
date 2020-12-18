const Discord = require('discord.js');

class FlareBot {
  constructor() {
    this.client = new Discord.Client();
  }

  start = () => {
    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}!`);
    });

    this.client.on('message', msg => {
      if (msg.content === 'ping') {
        msg.reply('poggers');
      }
    });

    this.client.login(process.env.DISCORD_FLAREBOT_TOKEN);
  }

}

module.exports = FlareBot;