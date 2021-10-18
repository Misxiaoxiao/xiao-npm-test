'use strict';

module.exports = core;

const semver = require('semver');
const colors = require('colors/safe');
const log = require('@cli-dev-test/log');

const pkg = require('../package.json');
const constant = require('./const');

function core() {
    try {
        // TODO
        checkPkgVersion();
        checkNodeVersion();
    } catch (err) {
        log.error(err.message);
    }
}

function checkNodeVersion () {
    // 第一步， 获取当前Node版本号
    const currentVersion = process.version;
    // 第二步，比对最低版本号
    const lowesetVersion = constant.LOWEST_NODE_VERSION;
    console.log(currentVersion, lowesetVersion)
    if (!semver.gte(currentVersion, lowesetVersion)) {
        throw new Error(colors.red(`cli 需要安装 v${lowesetVersion} 以上版本的 Node.js`));
    }
}

function checkPkgVersion () {
    log.info('cli', pkg.version);
}
