'use strict';

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');

// 获取当前 npm 的信息
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios.get(npmInfoUrl).then(response => {
    if (response.status === 200) {
      return response.data;
    }
    return null;
  }).catch(err => {
    return Promise.reject(err);
  })
}

// 选择 npm 的源地址
function getDefaultRegistry (isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org';
}

// 获取 npm 中的包的 versions 信息
async function getNpmVersions (npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  } else {
    return [];
  }
}

// 获取 npm 中的包高于当前版本的 versions 信息
function getSemverVersions (baseVersion, versions) {
  return versions.filter(
    version => semver.satisfies(version, `^${baseVersion}`)
  ).sort(
    (a, b) => semver.gt(b, a)
  );
}

async function getNpmSemverVersions (baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if (newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getDefaultRegistry,
  getNpmSemverVersions,
};
