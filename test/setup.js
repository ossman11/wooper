'use strict'

const Discord = require('discord.js')

module.exports.setup = function (configuration) {
  return new Promise((resolve, reject) => {
    const setupClient = new Discord.Client()

    setupClient.on('ready', () => {
      // Starting enviroment setup for test user
      var guild = setupClient.guilds.find(g => g.name.toLowerCase() === configuration.guild)
      if (!guild) {
        return reject(new Error(`Failed to setup test enviroment, because of the target guild ("${configuration.guild}") missing from the user.`))
      }

      return resolve()
    })

    setupClient.on('error', reject)
    setupClient.login(configuration.token)
  })
}
