const path = require('path');
const url = require('url');
const fs = require('fs').promises;
const { promisify } = require('util');
const Netstorage = require('netstorageapi');
const os = require('os');
const crypto = require('crypto');

module.exports = {
  provider: 'Akamai NetStorage',
  init: config => {
    const { hostname, keyName, key, cpCode, basePath, baseUrl, env, proxy } = config;

    const netStorage = new Netstorage({
      hostname,
      keyName,
      key,
      cpCode,
      ssl: true,
      proxy
    });
    netStorage.upload = promisify(netStorage.upload);
    netStorage.delete = promisify(netStorage.delete);
    console.log(')==============================UPLOAD SETUP=========================================>>')
    return {
      async upload(file) {
        try {
          const tmpFile = await createTmpFile(file);

          const folderPath = getFolderPath(basePath, env, file.name);

          const netStoragePath = path.join(cpCode, folderPath, file.hash + file.ext);
          console.log(')==============================UPLOAD ACTION=========================================>>')
          console.log('provider sending file -> ', tmpFile);
          console.log('provider sending to   -> ', netStoragePath);
          console.log('<<====================================================================================(')

          await netStorage.upload(tmpFile, netStoragePath);

          setBasePath(baseUrl, folderPath, file);
        } catch (err) {
          console.log(`An error has occurred while uploading the file ${file.hash + file.ext}`, err);
        }
      },
      async delete(file) {
        try {
          const folderPath = getFolderPath(basePath, env, file.name);
          const netStoragePath = path.join(cpCode, folderPath, file.hash + file.ext);
          await netStorage.delete(netStoragePath);
        } catch (err) {
          console.log(`An error has occurred while deleting the file ${file.hash + file.ext}`);
        }
      }
    };
  }
};

function getFolderPath(basePath, env, fileName) {
  const shasum = crypto.createHash('sha1');
  shasum.update(fileName);
  const hash = shasum.digest('hex');

  const firstLevel = hash.substring(0, 2);
  const secondLevel = hash.substring(2, 4);

  return path.join(basePath, env, firstLevel, secondLevel);
}

async function createTmpFile(file) {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, file.hash + file.ext);
  await fs.writeFile(tmpFile, file.buffer);
  return tmpFile;
}

function setBasePath(baseUrl, folderPath, file) {
  const akamaiUrl = new url.URL(baseUrl);
  akamaiUrl.pathname = path.join(folderPath, file.hash + file.ext);
  file.url = akamaiUrl.toString();
}
