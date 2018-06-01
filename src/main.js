'use strict'

const configuration = require('../wooper.json')

const Discord = require('discord.js')
const client = new Discord.Client()

const fetchFunction = function (msg) {
  var fnc = require('./' + msg.channel.type)
  var name = /!([^ ]*)/.exec(msg.content)
  name = name && name[1]
  if (name && fnc[name] && typeof fnc[name] === 'function') {
    return fnc[name](msg)
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  console.log(`Can be invited using this url: https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot`)
})

client.on('message', msg => {
  // Ensure that the author is known and it is not a bot
  if (!msg.author || msg.author.bot) { return }

  fetchFunction(msg)
})

client.login(configuration.token)
