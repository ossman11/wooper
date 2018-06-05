'use strict'

const Discord = require('discord.js')

const commands = require('./commands/main.js')
const Playlist = require('./lib/playlist.js')

module.exports.create = function (configuration) {
  // Create the discord client with woop context
  const client = new Discord.Client()
  client.__woop__ = configuration

  // Attach to ready event to
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`)
    console.log(`Can be invited using this url: https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot`)
    if (configuration.guild && typeof configuration.guild === 'string') {
      var defaultPlaylist = new Playlist(client, configuration.guild)
      defaultPlaylist.init()
    }
  })

  // Attach the wooper commands to the client
  commands.attach(client)

  // Attach to the error event to handle the client errors
  client.on('error', err => {
    console.error(err)
  })

  return client
}

module.exports.login = function (client) {
  // Ensure that the client is setup with the wooper context
  if (!client.__woop__) { throw new Error('Failed to login, because this client is missing the wooper context.') }

  // Login and logout user to ensure that the connection is reset
  const tmpClient = new Discord.Client()

  tmpClient.on('ready', function () {
    tmpClient.destroy()
  })
  tmpClient.on('disconnect', function () {
    client.login(client.__woop__.token)
  })

  tmpClient.login(client.__woop__.token)

  return new Promise(resolve => client.on('ready', resolve))
}

if (process.mainModule === module) {
  const client = module.exports.create(require('../wooper.json'))
  module.exports.login(client)
}
