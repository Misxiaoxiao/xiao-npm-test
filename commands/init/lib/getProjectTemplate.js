const request = require('@cli-dev-test/request')

module.exports = function() {
  return request({
    url: '/project/template'
  })
}
