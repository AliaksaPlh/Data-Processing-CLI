const path = require("path");
const fsPromises = require("fs").promises;
const { resolvePath } = require("./utils/pathResolver");

/**
 * @param {string} currentDir
 */
const printCurrentDir = (currentDir) => {
  console.log(`You are currently in ${currentDir}`);
};

/**
 * up
 * @param {string} currentDir
 * @returns {Promise<{ ok: boolean, currentDir?: string }>}
 */
const handleUp = async (currentDir) => {
  const root = path.parse(currentDir).root;
  if (currentDir === root) {
    return { ok: true, currentDir };
  }
  const parent = path.dirname(currentDir);
  return { ok: true, currentDir: parent };
};

/**
 * cd path_to_directory
 * @param {string} currentDir
 * @param {string} dirPath
 * @returns {Promise<{ ok: boolean, currentDir?: string }>}
 */
const handleCd = async (currentDir, dirPath) => {
  if (!dirPath || dirPath.trim() === "") {
    return { ok: false };
  }
  const targetPath = resolvePath(currentDir, dirPath);
  try {
    const stat = await fsPromises.stat(targetPath);
    if (!stat.isDirectory()) {
      return { ok: false };
    }
    return { ok: true, currentDir: targetPath };
  } catch {
    return { ok: false };
  }
};

/**
 * ls
 * @param {string} currentDir
 * @returns {Promise<{ ok: boolean }>}
 */
const handleLs = async (currentDir) => {
  try {
    const entries = await fsPromises.readdir(currentDir, {
      withFileTypes: true,
    });
    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({ name: e.name, type: "folder" }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => ({ name: e.name, type: "file" }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    const all = [...folders, ...files];
    for (const item of all) {
      const typeLabel = item.type === "folder" ? "[folder]" : "[file]";
      console.log(`${item.name}    ${typeLabel}`);
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

module.exports = {
  printCurrentDir,
  handleUp,
  handleCd,
  handleLs,
};
