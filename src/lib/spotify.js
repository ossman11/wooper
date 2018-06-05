/* TODO: make it work with some other library then spotify-web as that is an old library
var Spotify = require('spotify-web')
// 'spotify:track:6tdp8sdXrXlPV6AZZN2PE8'

module.exports.create = function (credentials) {
  return new Promise((resolve, reject) => {
    Spotify.login(credentials.user, credentials.pass, function (err, spotify) {
      if (err) { return reject(err) }

      var fnCreate = function (uri) {
        return new Promise((resolve, reject) => {
          spotify.get(uri, function (err, track) {
            if (err) { return reject(err) }
            return resolve(track.play())
          })
        })
      }

      spotify.create = fnCreate
      return resolve(spotify)
    })
  })
}
*/
