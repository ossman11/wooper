'use strict'

var setup = require('./setup.js')
var wooper = require('../src/main.js')

const configuration = require('./wooper.json')

setup.setup(configuration)
  .then(() => {
    var client = wooper.create(configuration)
    wooper.login(client)

    client.on('ready', () => {
      console.log('Start wooper-dev client')
    })
  })
