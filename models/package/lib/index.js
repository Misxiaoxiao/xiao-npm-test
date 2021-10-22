'use strict';

const pkgDir = require('pkg-dir').sync;
const path = require('path');

const { isObject } = require('@cli-dev-test/utils');
const formatPath = require('@cli-dev-test/format-path');

class Package {
  constructor(options) {
    if (!options || !isObject(options)) {
      throw new Error('Package 类的 options 参数不能为空！');
    }
    if (!isObject(options)) {
      throw new Error('Package 类的 options 参数必须为对象！')
    }
    // package 的路径
    this.targetPath = options.targetPath;
    // package 的存储路径
    // this.storePath = options.storePath;
    // package 的 name
    this.packageName = options.packageName;
    // package 的 version
    this.packageVersion = options.packageVersion;
  }

  // 判断当前 package 是否存在
  exists() { }

  // 安装 package
  install() { }

  // 更新 Package
  update() { }

  // 获取入口文件的路径
  getRootFilePath() {
    // 1. 获取 package.json 的所在目录 - pkg-dir
    const dir = pkgDir(this.targetPath);
    if (dir) {
      // 2. 读取 package.json - require()
      const pkgFile = require(path.resolve(dir, 'package.json'));
      // 3. main | lib - path
      if (pkgFile && (pkgFile.main || pkgFile.lib)) {
        const url = pkgFile.main || pkgFile.lib;
        return formatPath(path.resolve(dir, url));
      }
      
      // 4. 路劲的兼容 (macOs | windows)
    }
    return null;
  }
}

module.exports = Package;
