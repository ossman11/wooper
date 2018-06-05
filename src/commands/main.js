'use strict'

const fetchFunction = function (msg) {
  try {
    var fnc = require('./' + msg.channel.type)
  } catch (e) { return } // Ignore commands that are unknown
  var name = /!([^ ]*)/.exec(msg.content)
  name = name && name[1]
  if (name && fnc[name] && typeof fnc[name] === 'function') {
    return fnc[name](msg)
  }
}

module.exports.attach = function (client) {
  client.on('message', msg => {
    // Ensure that the author is known and it is not a bot
    if (!msg.author || msg.author.bot) { return }

    fetchFunction(msg)
  })
}
