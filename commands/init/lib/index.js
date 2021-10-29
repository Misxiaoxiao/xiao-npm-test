'use strict';

const Command = require('@cli-dev-test/command');
const log = require('@cli-dev-test/log');

class InitCommand extends Command {
  init () {
    this.projectName = this._argv[0] || null;
    this.force = !!this._cmd.force;
    log.verbose('projectName', this.projectName);
    log.verbose('force', this.force);
  }

  exec () {
    console.log('init 的业务逻辑')
  }
}

function init (argv) {
  new InitCommand(argv);
}

module.exports = init;
