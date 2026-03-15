const fs = require("fs");
const fsPromises = require("fs").promises;
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");
const { resolvePath } = require("../utils/pathUtils");

/**
 * pars parseCsvLine into arr fields
 * @param {string} line
 * @returns {Array<string>}
 */
const parseCsvLine = (line) => {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = "";
      i += 1;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i += 1;
            break;
          }
        } else {
          field += line[i];
          i += 1;
        }
      }
      fields.push(field);
    } else {
      let field = "";
      while (i < line.length && line[i] !== ",") {
        field += line[i];
        i += 1;
      }
      fields.push(field.trim());
      if (line[i] === ",") i += 1;
    }
  }
  return fields;
};

/**
 *  transform stream: CSV text to JSON arr text (1st line = headers)
 * @returns {Transform}
 */
const createCsvToJsonTransform = () => {
  let buffer = "";
  let headers = null;
  let firstRow = true;

  return new Transform({
    objectMode: false,
    transform(chunk, encoding, callback) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim() === "") continue;
        if (headers === null) {
          headers = parseCsvLine(line);
          continue;
        }
        const values = parseCsvLine(line);
        const obj = {};
        for (let i = 0; i < headers.length; i++) {
          obj[headers[i]] = values[i] ?? "";
        }
        const piece = firstRow
          ? "[\n  " + JSON.stringify(obj)
          : ",\n  " + JSON.stringify(obj);
        firstRow = false;
        this.push(piece);
      }
      callback();
    },
    flush(callback) {
      if (headers !== null && firstRow) {
        this.push("[\n]");
      } else if (headers !== null && !firstRow) {
        this.push("\n]\n");
      }
      callback();
    },
  });
};

/**
 * CSV file to a JSON file using Streams
 * @param {string} currentDir
 * @param {string} inputPath -  to input CSV (rel/abs)
 * @param {string} outputPath -  to output JSON (rel/abs)
 * @returns {Promise<{ ok: boolean }>}
 */
const handleCsvToJson = async (currentDir, inputPath, outputPath) => {
  const resolvedInput = resolvePath(currentDir, inputPath);
  const resolvedOutput = resolvePath(currentDir, outputPath);
  try {
    await fsPromises.access(resolvedInput);
  } catch {
    return { ok: false };
  }
  try {
    const readStream = fs.createReadStream(resolvedInput, { encoding: "utf8" });
    const transformStream = createCsvToJsonTransform();
    const writeStream = fs.createWriteStream(resolvedOutput, {
      encoding: "utf8",
    });
    await pipeline(readStream, transformStream, writeStream);
    return { ok: true };
  } catch {
    return { ok: false };
  }
};

module.exports = {
  handleCsvToJson,
};
