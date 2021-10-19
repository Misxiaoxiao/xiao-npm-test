'use strict';

module.exports = core;

const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const log = require('@cli-dev-test/log');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;

const pkg = require('../package.json');
const constant = require('./const');

let args, config;

function core() {
  try {
    // TODO
    checkRoot();
    checkPkgVersion();
    checkNodeVersion();
    checkUserHome();
    checkInputArgs();
    checkEnv();
  } catch (err) {
    log.error(err.message);
  }
}

// 检测环境变量
function checkEnv () {
  const dotenv = require('dotenv');
  const dotenvPath = path.resolve(userHome, '.env')
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    });
  }
  createDefaultConfig();
  log.verbose('环境变量', process.env.CLI_HOME_PATH);
}

// 创建默认环境变量配置
function createDefaultConfig () {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
}

// 根据环境变量检测log
function checkInputArgs () {
  const minimist = require('minimist');
  args = minimist(process.argv.slice(2));
  checkArgs();
}

// 修改log的level
function checkArgs() {
  if (args.debug) {
    process.env.LOG_LEVEL = 'verbose';
  } else {
    process.env.LOG_LEVEL = 'info';
  }
  log.level = process.env.LOG_LEVEL;
}

function checkUserHome() {
  console.log(userHome);
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在！'));
  }
}

// 检测root账户，降级当前用户等级
function checkRoot() {
  const rootCheck = require('root-check');
  rootCheck();
  console.log(process.geteuid())
}

// 检测node版本
function checkNodeVersion() {
  // 第一步， 获取当前Node版本号
  const currentVersion = process.version;
  // 第二步，比对最低版本号
  const lowesetVersion = constant.LOWEST_NODE_VERSION;
  if (!semver.gte(currentVersion, lowesetVersion)) {
    throw new Error(colors.red(`cli 需要安装 v${lowesetVersion} 以上版本的 Node.js`));
  }
}

// 检测当前包版本
function checkPkgVersion() {
  log.info('cli', pkg.version);
}
