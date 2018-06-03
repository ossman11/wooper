'use strict'

const ytdl = require('ytdl-core')
const parse = require('./parse.js')

const streamOptions = { seek: 0, volume: 0.1 }
const availableCommands = ['add', 'skip', 'remove', 'start', 'resume', 'stop', 'pause', 'pauze', 'join', 'leave']

/**
 * Creates an playlist for a certain guild in which people can control the playlist
 * @class Playlist
 * @param {Object} client An discord client
 * @param {string} guild The name of the guild to add the playlist to
 * @param {string} channel The name of the channel which controls the playlist
 */
var Pl = function (client, guild, channel) {
  this._client = client
  this._guild = client.guilds.find(g => g.name.toLowerCase() === guild)
  if (!this._guild) {
    throw new Error(`Failed to create playlist as the guild ${guild} is unknown to the client.`)
  }
  this._channelName = channel || 'woop'

  this._entries = {}
  this._order = []
}

Pl.prototype.init = function () {
  // Only initliaze once
  if (this._initPromise) { return this._initPromise }

  var channelWoop = this._guild.channels.find(c => c.name === this._channelName)
  var channelPromise = Promise.resolve(channelWoop)
  if (!channelWoop) {
    channelPromise = this._guild.createChannel(this._channelName, 'text')
  }
  this._initPromise = channelPromise
    .then(channel => {
      this._channel = channel
      this._client.on('message', this.handleMessage.bind(this))
      return this._channel.fetchMessages()
    })
    .then(messages => {
      messages.forEach(m => {
        if (m.author !== this._client.user) { m.delete() }
        this.add(m.content)
      })
    })

  return this._initPromise
}

Pl.prototype.handleMessage = function (msg) {
  // Ensure the message belongs to the current playlist
  if (msg.channel !== this._channel) { return }
  if (msg.author === this._client.user) { return }

  // Remove message automatically
  msg.delete()

  // Extract the command and call the command
  var command = parse.cmd(msg.content)
  if (command && availableCommands.indexOf(command) > -1) {
    this[command + 'Cmd'](msg)
  }
}

const checks = [
  {
    type: 'youtube',
    extract: /https?:\/\/www\.youtube\.com\/.*\?.*&?v=([^&\s]*)/,
    src: 'https://youtu.be/{id}'
  },
  {
    type: 'youtube',
    extract: /https?:\/\/youtu\.be\/([^?&\s]*)/,
    src: 'https://youtu.be/{id}'
  }
]
Pl.prototype.validateUrl = function (src) {
  var match = false
  for (var i = 0; i < checks.length; i++) {
    if (
      (checks[i].test && checks[i].test.test(src)) ||
      (checks[i].extract && checks[i].extract.test(src))
    ) {
      match = checks[i]
      break
    }
  }
  return match
}

Pl.prototype.parseUrl = function (src) {
  var target = this.validateUrl(src)
  if (!target) { return }

  this._entries[target.type] = this._entries[target.type] || {}

  var id = target.extract.exec(src)
  id = id && id[1]

  this._entries[target.type][id] = this._entries[target.type][id] || {}
  var entry = this._entries[target.type][id]
  entry.src = target.src && target.src.replace('{id}', id)
  entry.type = target.type
  entry.prom = entry.prom || new Promise((resolve, reject) => {
    entry.resolve = resolve
    entry.reject = reject
  })

  switch (entry.type) {
    case 'youtube':
      entry.stream = ytdl(entry.src, { filter: 'audioonly' })
      break
    default: return
  }

  return entry
}

Pl.prototype.reply = function (msg, content) {
  return msg.author.createDM()
    .then(c => c.send(content))
}

Pl.prototype.add = function (url) {
  var entry = this.parseUrl(url)
  if (!entry) { return }
  return this._channel.fetchMessages()
    .then(msgs => {
      var msg = msgs.find(m => m.content === entry.src && m.author === this._client.user)
      if (!msg) {
        return this._channel.send(entry.src)
      }
      return msg
    })
    .then(msg => {
      entry.msg = msg
      if (this._order.indexOf(entry) < 0) {
        this._order.push(entry)
      }
    })
}

Pl.prototype.remove = function (url) {
  var entry = this.parseUrl(url)
  if (!entry) { return }
  if (entry.msg) {
    entry.msg.delete()
    delete entry.msg
  }
  while (this._order.indexOf(entry) > -1) {
    var i = this._order.indexOf(entry)
    this._order.splice(i, 1)
  }
  if (entry.player) {
    entry.player.end()
  }
  return entry.prom
}

Pl.prototype.next = function () {
  if (this.nexting) { return }
  var entry = this._order[0]
  if (!entry) { return }

  this.nexting = true

  this.remove(entry.src)
  entry.prom.then(() => {
    this.nexting = false
    if (this.playing) {
      this.start()
    }
  })
}

Pl.prototype.join = function (targetChannel) {
  var channel = this._guild.channels.find(c => c.name.toLowerCase() === targetChannel)
  if (!channel || channel.type !== 'voice') { return }
  channel.join()
    .then(con => {
      this._connection = con
      if (this.playing) { this.start() }
    })
    .catch(e => {
      console.error(e)
    })
}

Pl.prototype.start = function () {
  var entry = this._order[0]
  if (!entry || !this._connection) { return }

  this.playing = true

  if (entry.player) {
    if (entry.player.paused) {
      return entry.player.resume()
    }
  }

  if (!entry.stream || entry.stream.destroyed) {
    this.add(entry.src)
  }

  entry.player = this._connection.playStream(entry.stream, streamOptions)
  entry.player.on('end', () => {
    entry.stream.destroy()
    delete entry.stream
    entry.player.destroy()
    delete entry.player
    entry.resolve()
    this.next()
  })
}

Pl.prototype.stop = function () {
  this.playing = false
  this.next()
}

Pl.prototype.pause = function () {
  var entry = this._order[0]
  if (!entry || !this._connection || !entry.player) { return }

  entry.player.pause()
}

// Commands

Pl.prototype.addCmd = function (msg) {
  console.log(`Called "add" command by ${msg.author.username}`)
  var args = parse.args(msg.content)
  for (var i = 0; i < args.length; i++) {
    this.add(args[i])
  }
}

Pl.prototype.removeCmd = function (msg) {
  console.log(`Called "remove" command by ${msg.author.username}`)
  var args = parse.args(msg.content)
  for (var i = 0; i < args.length; i++) {
    this.remove(args[i])
  }
}

Pl.prototype.skipCmd = function (msg) {
  console.log(`Called "skip" command by ${msg.author.username}`)
  this.next()
}

Pl.prototype.startCmd = function (msg) {
  console.log(`Called "start" command by ${msg.author.username}`)
  this.start()
}

Pl.prototype.stopCmd = function (msg) {
  console.log(`Called "stop" command by ${msg.author.username}`)
  this.stop()
}

Pl.prototype.pauseCmd = function (msg) {
  console.log(`Called "pause" command by ${msg.author.username}`)
  this.pause()
}

Pl.prototype.pauzeCmd = Pl.prototype.pauseCmd
Pl.prototype.resumeCmd = Pl.prototype.start

Pl.prototype.joinCmd = function (msg) {
  console.log(`Called "join" command by ${msg.author.username}`)
  var args = parse.args(msg.content)
  this.join(args[0])
}

Pl.prototype.leaveCmd = function (msg) {
  console.log(`Called "leave" command by ${msg.author.username}`)
  this.reply(msg, 'This functionality is not yet available.')
}

module.exports = Pl
