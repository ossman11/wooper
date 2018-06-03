'use strict'

const configuration = require('../wooper.json')

const Discord = require('discord.js')
const client = new Discord.Client()

const Playlist = require('./lib/playlist.js')

const fetchFunction = function (msg) {
  try {
    var fnc = require('./commands/' + msg.channel.type)
  } catch (e) { return } // Ignore commands that are unknown
  var name = /!([^ ]*)/.exec(msg.content)
  name = name && name[1]
  if (name && fnc[name] && typeof fnc[name] === 'function') {
    return fnc[name](msg)
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
  console.log(`Can be invited using this url: https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot`)
  if (configuration.guild && typeof configuration.guild === 'string') {
    var defaultPlaylist = new Playlist(client, configuration.guild)
    defaultPlaylist.init()
      .then(() => {
        console.log('Started playlist')
      })
  }
})

client.on('message', msg => {
  // Ensure that the author is known and it is not a bot
  if (!msg.author || msg.author.bot) { return }

  fetchFunction(msg)
})

client.on('error', err => {
  console.error(err)
})

// Login and logout user to ensure that the connection is reset
const tmpClient = new Discord.Client()
tmpClient.login(configuration.token)
  .then(() => tmpClient.destroy())
  .then(() => client.login(configuration.token))
