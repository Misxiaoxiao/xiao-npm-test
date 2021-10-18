'use strict';

module.exports = core;

const semver = require('semver');
const colors = require('colors/safe');
const log = require('@cli-dev-test/log');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;

const pkg = require('../package.json');
const constant = require('./const');

function core() {
    try {
        // TODO
        checkRoot();
        checkPkgVersion();
        checkNodeVersion();
        checkUserHome();
    } catch (err) {
        log.error(err.message);
    }
}

function checkUserHome () {
    console.log(userHome);
    if (!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在！'));
    }
}

// 检测root账户，降级当前用户等级
function checkRoot () {
    const rootCheck = require('root-check');
    rootCheck();
    console.log(process.geteuid())
}

// 检测node版本
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

// 检测当前包版本
function checkPkgVersion () {
    log.info('cli', pkg.version);
}
