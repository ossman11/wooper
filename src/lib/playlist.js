'use strict'

// const spot = require('./spotify.js')
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

  this._currentList = ''
  this._currentEntry = 0
  this._services = {}
  this._entries = {}
  this._order = []
  this._lists = {}
}

Pl.prototype.init = function () {
  // Only initliaze once
  if (this._initPromise) { return this._initPromise }

  var channelWoop = this._guild.channels.find(c => c.name === this._channelName)
  var channelPromise = Promise.resolve(channelWoop)
  if (!channelWoop) {
    channelPromise = this._guild.createChannel(this._channelName, 'text')
  }
  this._initPromise = this.prepareServices()
    .then(() => channelPromise)
    .then(channel => {
      this._channel = channel
      this._client.on('message', this.handleMessage.bind(this))
      return this._channel.fetchMessages()
    })
    .then(messages => {
      messages.forEach(m => {
        if (m.system) { return }
        if (m.author !== this._client.user) {
          if (m.deletable) {
            return m.delete()
          }
        }
        this.playlist(m.content, m)
      })
    })

  return this._initPromise
}

Pl.prototype.prepareServices = function () {
  this._services = {}
  return Promise.resolve()
    // Setup youtube
    .then(() => {
      this._services.youtube = {
        create: function (src) {
          return ytdl(src, { filter: 'audioonly' })
        }
      }
    })
  /*
  // Setup spotify
  .then(() => spot.create(this._client.__woop__.cred.spotify))
  .then(spot => { this._services.spotify = spot })
  */
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
  },
  {
    type: 'spotify',
    extract: /spotify:track:(.*)/,
    src: 'spotify:track:{id}'
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

  if (this._services[entry.type]) {
    entry.stream = this._services[entry.type].create(entry.src)
  }

  return entry
}

Pl.prototype.reply = function (msg, content) {
  return msg.author.createDM()
    .then(c => c.send(content))
}

var extractPlaylistName = /list: (.*)/
Pl.prototype.editPlaylistMsg = function (msg, entries) {
  var name = msg.content
  if (extractPlaylistName.test(name)) {
    name = extractPlaylistName.exec(name.split('\n').shift())[1]
  }
  if (!entries) {
    entries = msg.content.split('\n')
  }
  var map = {}
  for (var i = 0; i < entries.length; i++) {
    var cur = entries[i]
    if (extractPlaylistName.test(cur)) { continue }
    map[cur] = true
  }
  var newContent = ['list: ' + name].concat(Object.keys(map)).join('\n')

  if (msg.content !== newContent) {
    return msg.edit(newContent)
      .then(msg => {
        if (this._lists[name] === this._currentList) {
          var entry = this.parseUrl(this._order[this._currentEntry])
          var entries = newContent.split('\n')
          entries.shift()

          if (entry) {
            this._currentEntry = entries.indexOf(entry.src)
          } else {
            this._currentEntry = 0
          }

          this._order = entries
        }
        return msg
      })
  }
  return Promise.resolve(msg)
}

Pl.prototype.playlist = function (name, srcmsg) {
  var entries = []
  if (extractPlaylistName.test(name)) {
    entries = name.split('\n')
    name = extractPlaylistName.exec(entries.shift())[1]
  }
  name = name || 'woop'
  name = name.toLowerCase()

  if (this._lists[name] && srcmsg) {
    this._lists[name].msg = this._lists[name].msg
      .then(msg => {
        if (srcmsg.deletable) {
          srcmsg.delete()
        }
        return this.editPlaylistMsg(msg, msg.content.split('\n').concat(entries))
      })
  }
  this._lists[name] = this._lists[name] || {
    order: entries,
    msg: srcmsg ? this.editPlaylistMsg(srcmsg) : this._channel.send(['list: ' + name].concat(entries))
  }

  if (srcmsg && srcmsg.pinned) {
    this.start(name)
  }

  return this._lists[name]
}

Pl.prototype.add = function (url, listName) {
  var entry = this.parseUrl(url)
  if (!entry) { return }
  var list = this.playlist(listName)
  list.msg = list.msg
    .then(msg => {
      var cont = msg.content.split('\n')
      if (cont.indexOf(entry.src) < 0) {
        cont.push(entry.src)
        return this.editPlaylistMsg(msg, cont)
      }
      return msg
    })
  return list.msg
}

Pl.prototype.remove = function (url, listName) {
  var entry = this.parseUrl(url)
  if (!entry) { return }

  var list = this.playlist(listName)
  list.msg = list.msg
    .then(msg => {
      var entries = msg.content.split('\n')
      var i = entries.indexOf(entry.src)
      if (i > -1) {
        entries.splice(i, 1)
        return this.editPlaylistMsg(msg, entries)
      }
      return msg
    })
    .then(msg => this.stop(entry).then(() => msg))
  return list.msg
}

Pl.prototype.next = function () {
  if (this.stopping) { return }
  var entry = this.parseUrl(this._order[this._currentEntry])
  if (!entry) { return }

  this.stop(entry)
    .then(() => {
      this._currentEntry++
      if (this._currentEntry >= this._order.length) {
        this._currentEntry = 0
      }
      if (this.playing) {
        this.start()
      }
    })
}

Pl.prototype.join = function (targetChannel) {
  var channel = this._guild.channels.find(c => c.name.toLowerCase() === targetChannel && c.type === 'voice')
  if (!channel || channel.type !== 'voice') { return }
  channel.join()
    .then(con => {
      this._connection = con
      this.start()
    })
    .catch(e => {
      console.error(e)
    })
}

Pl.prototype.start = function (listName) {
  var list = this.playlist(listName)
  var prom = Promise.resolve()
  if (this._currentList !== list) {
    prom = this.stop()
      .then(() => {
        if (
          this._currentList &&
          this._currentList.msg &&
          typeof this._currentList.msg.then === 'function'
        ) {
          return this._currentList.msg
            .then(msg => msg.unpin())
        }
      })
      .then(() => {
        this._currentList = list
        this._currentEntry = 0
        return list.msg
      })
      .then(msg => {
        var entries = msg.content.split('\n')
        entries.shift()
        this._order = entries
        msg.pin()
      })
  }

  return prom
    .then(() => {
      var entry = this.parseUrl(this._order[this._currentEntry])

      this.playing = true
      if (!entry || !this._connection) { return }

      if (entry.player) {
        if (entry.player.paused) {
          return entry.player.resume()
        }
        return
      }

      if (!entry.stream || entry.stream.destroyed) {
        this.add(entry.src)
      }

      var fnPlay = function () {
        entry.player = this._connection.playStream(entry.stream, streamOptions)
        entry.player.on('end', () => {
          entry.stream.destroy()
          delete entry.stream
          entry.player.destroy()
          delete entry.player
          entry.resolve()
          delete entry.prom
          this.next()
        })
      }.bind(this)

      if (
        entry.stream &&
        typeof entry.stream.then === 'function'
      ) {
        entry.stream
          .then((stream) => {
            entry.stream = stream
            fnPlay()
          })
      } else {
        fnPlay()
      }
    })
}

Pl.prototype.stop = function (entry) {
  if (this.stopping) { return Promise.resolve() }
  entry = entry || this.parseUrl(this._order[this._currentEntry])
  if (!entry) { return Promise.resolve() }
  var prom = entry.prom
  if (entry.player) {
    this.stopping = true
    entry.player.end()
    prom = prom
      .then(() => {
        this.stopping = false
      })
  } else {
    return Promise.resolve()
  }
  return prom
}

Pl.prototype.pause = function () {
  var entry = this.parseUrl(this._order[this._currentEntry])
  if (!entry || !this._connection || !entry.player) { return }

  entry.player.pause()
}

// Commands

Pl.prototype.addCmd = function (msg) {
  console.log(`Called "add" command by ${msg.author.username}`)
  var args = parse.args(msg.content)
  var list
  if (!this.parseUrl(args[0])) {
    list = args[0]
  }

  for (var i = 0; i < args.length; i++) {
    this.add(args[i], list)
  }
}

Pl.prototype.removeCmd = function (msg) {
  console.log(`Called "remove" command by ${msg.author.username}`)
  var args = parse.args(msg.content)

  var list
  if (!this.parseUrl(args[0])) {
    list = args[0]
  }

  for (var i = 0; i < args.length; i++) {
    this.remove(args[i], list)
  }
}

Pl.prototype.skipCmd = function (msg) {
  console.log(`Called "skip" command by ${msg.author.username}`)
  this.next()
}

Pl.prototype.startCmd = function (msg) {
  console.log(`Called "start" command by ${msg.author.username}`)
  var args = parse.args(msg.content)
  this.start(args[0])
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
Pl.prototype.resumeCmd = Pl.prototype.startCmd

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
