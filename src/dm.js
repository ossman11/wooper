'use strict'

module.exports.help = function (msg) {
  return msg.reply('There are currently no functions available inside the direct messages.')
}

module.exports.ping = function (msg) {
  msg.reply('pong')
}

module.exports.woop = function (msg) {
  msg.reply('I am woopy wooper.')
}
