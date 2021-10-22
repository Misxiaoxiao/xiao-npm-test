'use strict';

module.exports = core;

const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const commander = require('commander');
const log = require('@cli-dev-test/log');
const init = require('@cli-dev-test/init');

const pkg = require('../package.json');
const constant = require('./const');

const program = new commander.Command();

async function core() {
  try {
    await prepare();
    registerCommand();
  } catch (err) {
    log.error(err.message);
  }
}

// 注册全局命令
function registerCommand () {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否制定本地调试文件路径', '');

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(init);
  
  // 开启 debug 模式
  program.on('option:debug', function () {
    if (program.debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }
    log.level = process.env.LOG_LEVEL;
  })

  // 对未知命令监听
  program.on('command:*', function (obj) {
    const availableCommands = program.commands.map(cmd => cmd.name());
    console.log(colors.red(`未知的命令：${obj[0]}`));
    if (availableCommands.length > 0) {
      console.log(colors.red(`可用命令：${availableCommands.join(',')}`));
    }
  })

  // 指定 targetPath
  program.on('option:targetPath', function () {
    process.env.CLI_TARGET_PATH = program.targetPath;
  })

  program.parse(process.argv);

  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log();
  }
}

async function prepare () {
  checkPkgVersion();
  checkNodeVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGlobalUpdate();
}

// 检测是否需要进行全局更新
async function checkGlobalUpdate () {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  // 2. 调用npm API，获取所有版本号
  const { getNpmSemverVersions } = require('@cli-dev-test/get-npm-info');
  const lastVersion = await getNpmSemverVersions(currentVersion, npmName);
  // 3. 提取所有版本号，比对那些版本号是大于当前版本号
  // 4. 获取最新的版本号，提示用户更新到该版本
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn('更新提示', colors.yellow(`
    请手动更新 ${npmName}
    当前版本：${currentVersion}
    最新版本：${lastVersion}
    更新命令：npm install -g ${npmName}`));
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

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在！'));
  }
}

// 检测root账户，降级当前用户等级
function checkRoot() {
  const rootCheck = require('root-check');
  rootCheck();
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
