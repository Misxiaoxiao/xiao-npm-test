'use strict';

const fs = require('fs');
const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const path = require('path');
const userHome = require('user-home')

const Command = require('@cli-dev-test/command');
const log = require('@cli-dev-test/log');
const Package = require('@cli-dev-test/package');
const { spinnerStart, sleep, exec, execAsync } = require('@cli-dev-test/utils')

const getProjectTemplate = require('./getProjectTemplate')

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const WHITE_COMMAND = ['npm', 'cnpm']

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
      const projectInfo = await this.prepare();
      if (projectInfo) {
        // 2. 下载模板
        log.verbose('projectInfo', projectInfo);
        await this.downloadTemplate();
        // 3. 安装模板
        await this.installTemplate()
      }
    } catch (err) {
      log.error(err.message);
    }
  }

  async downloadTemplate () {
    // 1. 通过项目模板API获取项目模板信息
    // 1.1 通过 egg.js 搭建一套后端系统
    // 1.2 通过 npm 存储项目模板
    // 1.3 将项目模板信息存储到 mongodb 数据库中
    // 1.4 通过 egg.js 获取 mongodb 中的数据并且通过 API 返回
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(item => item.npmName === projectTemplate);
    const targetPath = path.resolve(userHome, '.cli-dev', 'template');
    const storeDir = path.resolve(userHome, '.cli-dev', 'template', 'node_modules');
    const { npmName, version } = templateInfo;
    this.templateInfo = templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version
    })

    if (! await templateNpm.exists()) {
      const spinner = spinnerStart('正在下载模板...');
      await sleep();
      try {
        await templateNpm.install();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('下载模板成功');
          this.templateNpm = templateNpm
        }
      }
    } else {
      const spinner = spinnerStart('正在更新模板...');
      await sleep();
      try {
        await templateNpm.update();
      } catch (e) {
        throw e;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success('更新模板成功');
          this.templateNpm = templateNpm
        }
      }
    }
  }

  checkCommand (cmd) {
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd
    }

    return null
  }

  async installTemplate() {
    log.verbose('templateInfo', this.templateInfo)
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }
      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate()
      } else {
        throw new Error('无法识别项目模板类型！');
      }
    } else {
      throw new Error('项目模板信息不存在！');
    }
  }

  async execCommand (command, errMsg) {
    let ret
    if (command) {
      const cmdArray = command.split(' ');
      const cmd = this.checkCommand(cmdArray[0]);

      if (!cmd) {
        throw new Error('命令不存在！命令：' + command)
      }

      const args = cmdArray.slice(1);
      ret = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      })
    }
    if (ret !== 0) {
      throw new Error(errMsg);
    }
    return ret
  }

  // 安装标准模板
  async installNormalTemplate () {
    // 拷贝模板代码至当前目录
    let spinner = spinnerStart('正在安装模板');
    await sleep();
    try {
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template');
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (e) {
      throw e;
    } finally {
      spinner.stop(true);
      log.success('模板安装成功');
    }
    const { installCommand, startCommand } = this.templateInfo;
    // 依赖安装
    await this.execCommand(installCommand, '依赖安装过程中失败！')
    // 启动项目
    await this.execCommand(startCommand, '项目启动过程中失败！')

  }

  // 安装自定义模板
  async installCustomTemplate () {
    console.log('install custom template')
  }

  async prepare () {
    // 0. 判断项目模板是否存在
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error('项目模板不存在');
    }
    this.template = template;
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
    return this.getProjectInfo()
  }

  async getProjectInfo () {
    let projectInfo = {};
    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: TYPE_PROJECT,
      choices: [
        { name: '项目', value: TYPE_PROJECT },
        { name: '组件', value: TYPE_COMPONENT }
      ]
    });
    log.verbose('type', type)
    if (type === TYPE_PROJECT) {
      // 2. 获取项目的基本信息
      const project = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目名称',
          default: '',
          // 校验规则
          // 1. 输入的首字符必须为英文字符
          // 2. 尾字符必须为英文或数字，不能为字符
          // 3. 字符仅允许"-_"
          // 合法: a, a-b, a_b, a-b-c, a_b_c, a-b1-c1, a_b1_c1, a1, a1-b1-c1, a1_b1_c1
          // 不合法: 1, a_, a-, a_1, a-1
          validate: function (v) {
            const done = this.async();

            setTimeout(() => {
              if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                done('请输入合法的项目名称');
                return;
              }
              done(null, true);
            }, 0);
            // return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
          },
          filter: v => v
        },
        {
          type: 'input',
          name: 'projectVersion',
          message: '请输入项目版本号',
          default: '1.0.0',
          validate: function (v) {
            const done = this.async();
            
            setTimeout(() => {
              if (!semver.valid(v)) {
                done('请输入合法的项目版本号');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: v => !!semver.valid(v) ? semver.valid(v) : v
        },
        {
          type: 'list',
          name: 'projectTemplate',
          message: '请选择项目模板',
          choices: this.createTemplateChoice()
        }
      ])
      
      projectInfo = {
        type,
        ...project
      }
      this.projectInfo = projectInfo
    } else if (type === TYPE_COMPONENT) {

    }
    // return 项目基本信息（object）
    return projectInfo;
  }

  createTemplateChoice() {
    return this.template.map(item => ({
      value: item.npmName,
      name: item.name
    }))
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
