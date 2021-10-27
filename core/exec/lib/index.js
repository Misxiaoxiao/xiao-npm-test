'use strict';

const path = require('path');
const Package = require('@cli-dev-test/package');
const log = require('@cli-dev-test/log');

const SETTINGS = {
  init: 'vue'
}

const CACHE_DIR = 'dependencies';

async function exec () {
  let targetPath = process.env.CLI_TARGET_PATH;
  let storeDir = '';
  const homePath = process.env.CLI_HOME_PATH;
  log.verbose('targetPath', targetPath);
  log.verbose('homePath', homePath);

  const cmdObj = arguments[arguments.length - 1];
  const cmdName = cmdObj.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = '1.0.0';

  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR); // 生成缓存路径
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('targetPath', targetPath);
    log.verbose('storeDir', storeDir);

    const pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion
    });

    if (await pkg.exists()) {
      // 更新 package
      await pkg.update();
    } else {
      // 安装 package
      await pkg.install();
    }
  } else {
    const pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    });
    console.log(await pkg.exists());
    const rootFile = pkg.getRootFilePath();
    if (rootFile) {
      require(rootFile).apply(null, arguments);
    }
  }
}

module.exports = exec;
