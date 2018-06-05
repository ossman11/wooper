'use strict'

var isCmd = function (str) {
  return str.indexOf('!') === 0
}

var args = function (str) {
  var wraps = ['"', "'", '`']
  var subs = []
  var wrap
  var tmp = ''
  for (var i = 0; i < str.length; i++) {
    var cur = str[i]

    // Check if the current entry is closed
    if (cur === wrap || (!wrap && (cur === ' ' || cur === '\n'))) {
      subs.push(tmp)
      tmp = ''
      wrap = undefined
      continue
    }

    // Allow for wrapping of values that contain spaces
    if (!tmp && wraps.indexOf(cur) > -1) {
      wrap = cur
      continue
    }

    tmp += cur
  }
  // Add the trailing entry
  if (tmp) { subs.push(tmp) }

  // Remove the command if the first entry is an command
  if (subs[0] && isCmd(subs[0])) { subs.shift() }

  return subs
}

var cmd = function (str) {
  var wraps = ['"', "'", '`']
  var subs = []
  var wrap
  var tmp = ''
  for (var i = 0; i < str.length; i++) {
    var cur = str[i]

    // Check if the current entry is closed
    if (cur === wrap || (!wrap && cur === ' ')) {
      subs.push(tmp)
      tmp = ''
      wrap = undefined
      continue
    }

    // Allow for wrapping of values that contain spaces
    if (!tmp && wraps.indexOf(cur) > -1) {
      wrap = cur
      continue
    }

    tmp += cur
  }
  // Add the trailing entry
  if (tmp) { subs.push(tmp) }

  if (subs[0] && isCmd(subs[0])) {
    return subs[0].substr(1)
  }
  return ''
}

module.exports.cmd = cmd
module.exports.args = args
module.exports.isCmd = isCmd
