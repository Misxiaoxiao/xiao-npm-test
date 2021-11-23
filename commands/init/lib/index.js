'use strict';

const fs = require('fs');
const inquirer = require('inquirer');
const fse = require('fs-extra');

const Command = require('@cli-dev-test/command');
const log = require('@cli-dev-test/log');

class InitCommand extends Command {
  init () {
    this.projectName = this._argv[0] || null;
    this.force = !!this._cmd.force;
    log.verbose('projectName', this.projectName);
    log.verbose('force', this.force);
  }

  async exec () {
    try {
      // 1. 准备阶段
      const ret = await this.prepare()
      if (ret) {
        // 2. 下载模板
        // 3. 安装模板
      }
    } catch (err) {
      log.error(err.message)
    }
  }

  async prepare () {
    // 1. 判断当前目录是否为空
    const localPath = process.cwd()
    if (!this.isDirEmpty(localPath)) {
      // 1.1 询问是否继续创建
      let ifContinue = false;
      if (!this.force) {
        ifContinue = await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？'
        }).ifContinue;
        if (!ifContinue) return
      }
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 强制更新
        // 清空前给用户进行二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否确认清空当前目录下的文件？'
        })
        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    // 3. 选择创建项目或组件
    // 4. 获取项目的基本信息
  }

  isDirEmpty (localPath) {
    let fileList = fs.readdirSync(localPath);
    // 文件过滤的逻辑
    fileList = fileList.filter(
      file => (!file.startsWith('.') && ['node_modules'].indexOf(file) < 0)
    );
    return !fileList || fileList.length <= 0;
  }
}

function init (argv) {
  return new InitCommand(argv);
}

module.exports = init;
