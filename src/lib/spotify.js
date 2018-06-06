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

var SpotifyWebApi = require('spotify-web-api-node')
var YouTube = require('youtube-node')

var Sp = function (credentials) {
  this._spotifyApi = new SpotifyWebApi({
    clientId: credentials.user,
    clientSecret: credentials.pass,
    redirectUri: 'http://www.example.com/callback'
  })
  this._youtubeApi = new YouTube()
  this._youtubeApi.setKey(credentials.youtube)
}

Sp.prototype.convert = function (src) {
  return this._spotifyApi.clientCredentialsGrant()
    .then(data => this._spotifyApi.setAccessToken(data.body['access_token']))
    .then(() => {
      var playlistRegex = /spotify:user:([^:]*):playlist:([^:]*)/
      if (playlistRegex.test(src)) {
        var args = playlistRegex.exec(src)
        return this._spotifyApi.getPlaylist(args[1], args[2])
          .then(res => {
            var tracks = res.body.tracks.items
            var searches = []
            for (var i = 0; i < tracks.length; i++) {
              var cur = tracks[i].track
              searches.push(cur.artists[0].name + ' - ' + cur.name)
            }
            console.log(searches)
          })
      }
    })
  /*
  .then(() => this._spotifyApi.searchPlaylists('workout'))
  .then(res => {
    console.log(res)
  })
  */
}

module.exports = Sp
