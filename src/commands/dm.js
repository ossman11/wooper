'use strict'

const ytdl = require('ytdl-core')
const streamOptions = { seek: 0, volume: 0.1 }

module.exports.help = function (msg) {
  return msg.reply('There are currently no functions available inside the direct messages.')
}

module.exports.ping = function (msg) {
  // Check arguments
  var args = /![^ ]* "([^"]*)" "([^"]*)" "([^"]*)"/.exec(msg)
  if (!args || !args[1] || !args[2] || !args[3]) {
    return msg.reply('Print out the help of the function when arguments are missing.') // TODO: print out an help message when arguments are missing
  }
  var targetGuild = args[1].toLowerCase().replace('"', '')
  var targetChannel = args[2].toLowerCase().replace('"', '')
  var targetVideo = args[3].replace('"', '')

  // Ensure that the bot is part of the guild
  var guild = msg.client.guilds.find(g => g.name.toLowerCase() === targetGuild)
  if (!guild) { return msg.reply(`Failed to find the target server: ${targetGuild}`) }

  // Ensure that the channel is part of the guild
  var channel = guild.channels.find(c => c.name.toLowerCase() === targetChannel)
  if (!channel) { return msg.reply(`Failed to find the target server: ${channel}`) }

  if (targetVideo.startsWith('https://') || targetVideo.startsWith('http://')) {
    if (!/\/\/www\.youtube\.com\/watch?v=/.test(targetVideo) && !/\/\/yout\.be\//.test(targetVideo)) {
      msg.reply(`Failed to find the target video: ${targetVideo}, because this is not a valid youtube url.`)
    }
  } else {
    targetVideo = `https://youtu.be/${targetVideo}`
  }

  return channel.join()
    .then(con => {
      const stream = ytdl(targetVideo, { filter: 'audioonly' })
      const player = con.playStream(stream, streamOptions)
      player.on('end', () => {
        player.destroy()
        channel.leave()
        msg.reply(`Finished playing ${channel.name}.`)
      })
      msg.reply(`Started playing ${channel.name}.`)
    })
    .catch(e => {
      console.error(e)
    })
}

module.exports.kill = function (msg) {
  msg.client.destroy()
  process.exit()
}

module.exports.woop = function (msg) {
  msg.reply('I am woopy wooper.')
}
