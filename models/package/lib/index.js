'use strict';

const pkgDir = require('pkg-dir').sync;
const path = require('path');
const fse = require('fs-extra');
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync;

const { isObject } = require('@cli-dev-test/utils');
const formatPath = require('@cli-dev-test/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@cli-dev-test/get-npm-info');

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
    // 缓存 package 的路径
    this.storeDir = options.storeDir;
    // package 的存储路径
    // this.storePath = options.storePath;
    // package 的 name
    this.packageName = options.packageName;
    // package 的 version
    this.packageVersion = options.packageVersion;
    // package 的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }

  async prepare() {
    // 如果目录不存在时
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }

    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName);
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
  }

  getSpecificCacheFilePath(packageVersion) {
    // TODO: 需要根据当前最高版本去判断此处的版本信息
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
  }

  // 判断当前 package 是否存在
  async exists() {
    if (this.storeDir) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }

  // 安装 package
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [
        { name: this.packageName, version: this.packageVersion },
      ]
    })
  }

  // 更新 Package
  async update() {
    await this.prepare();
    // 1. 获取最新的版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    // 2. 查询最新版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion);
    // 3. 如果不存在，则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [
          { name: this.packageName, version: latestPackageVersion },
        ]
      });
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取入口文件的路径
  getRootFilePath() {
    function _getRootFile (targetPath) {
      // 1. 获取 package.json 的所在目录 - pkg-dir
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2. 读取 package.json - require()
        const pkgFile = require(path.resolve(dir, 'package.json'));
        // 3. main | lib - path
        if (pkgFile && (pkgFile.main || pkgFile.lib)) {
          const url = pkgFile.main || pkgFile.lib;
          return formatPath(path.resolve(dir, url));
        }

        // 4. 路径的兼容 (macOs | windows)
      }
      return null;
    }
    if (this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    } else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;
