const readline = require("readline");
const path = require("path");
const os = require("os");

const {
  WELCOME_MESSAGE,
  GOODBYE_MESSAGE,
  INVALID_INPUT_MESSAGE,
  OPERATION_FAILED_MESSAGE,
  PROMPT,
} = require("./constants");
const {
  parseInput,
  parseCsvToJsonArgs,
  parseJsonToCsvArgs,
  parseCountArgs,
  parseHashArgs,
  parseHashCompareArgs,
  parseEncryptArgs,
} = require("./utils/parseInput");
const {
  printCurrentDir,
  handleUp,
  handleCd,
  handleLs,
} = require("./commands/navigation");
const { handleCsvToJson } = require("./commands/csvToJson");
const { handleJsonToCsv } = require("./commands/jsonToCsv");
const { handleCount } = require("./commands/count");
const { handleHash } = require("./commands/hash");
const { handleHashCompare } = require("./commands/hashCompare");
const { handleEncrypt } = require("./commands/encrypt");
const { handleDecrypt } = require("./commands/decrypt");

/**
 * Main REPL loop
 */
const run = async () => {
  let currentDir = path.resolve(os.homedir());

  console.log(WELCOME_MESSAGE);
  printCurrentDir(currentDir);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const processLine = async (line) => {
    const { command, args, pathForCd } = parseInput(line);

    if (!command) {
      return;
    }

    if (command === ".exit") {
      console.log(GOODBYE_MESSAGE);
      rl.close();
      process.exit(0);
      return;
    }

    if (command === "up") {
      if (args.length > 0) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleUp(currentDir);
      if (result.ok) {
        currentDir = result.currentDir ?? currentDir;
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "cd") {
      const dirPath = pathForCd ?? args[0];
      if (!dirPath) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleCd(currentDir, dirPath);
      if (result.ok) {
        currentDir = result.currentDir ?? currentDir;
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "ls") {
      if (args.length > 0) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleLs(currentDir);
      if (result.ok) {
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "csv-to-json") {
      const rest = line.trim().slice(command.length).trim();
      const { input: inputArg, output: outputArg } = parseCsvToJsonArgs(rest);
      if (!inputArg || !outputArg) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleCsvToJson(currentDir, inputArg, outputArg);
      if (result.ok) {
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "json-to-csv") {
      const rest = line.trim().slice(command.length).trim();
      const { input: inputArg, output: outputArg } = parseJsonToCsvArgs(rest);
      if (!inputArg || !outputArg) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleJsonToCsv(currentDir, inputArg, outputArg);
      if (result.ok) {
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "count") {
      const rest = line.trim().slice(command.length).trim();
      const { input: inputArg } = parseCountArgs(rest);
      if (!inputArg) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleCount(currentDir, inputArg);
      if (result.ok) {
        console.log(`Lines: ${result.lines}`);
        console.log(`Words: ${result.words}`);
        console.log(`Characters: ${result.characters}`);
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "hash") {
      const rest = line.trim().slice(command.length).trim();
      const { input: inputArg, algorithm, save } = parseHashArgs(rest);
      if (!inputArg) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleHash(currentDir, inputArg, algorithm, save);
      if (result.ok) {
        console.log(`${result.algorithm}: ${result.hash}`);
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "hash-compare") {
      const rest = line.trim().slice(command.length).trim();
      const { input: inputArg, hash: hashArg, algorithm } =
        parseHashCompareArgs(rest);
      if (!inputArg || !hashArg) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleHashCompare(
        currentDir,
        inputArg,
        hashArg,
        algorithm,
      );
      if (!result.ok) {
        console.log(OPERATION_FAILED_MESSAGE);
      } else {
        console.log(result.match ? "OK" : "MISMATCH");
        printCurrentDir(currentDir);
      }
      return;
    }

    if (command === "encrypt") {
      const rest = line.trim().slice(command.length).trim();
      const { input: inputArg, output: outputArg, password: passwordArg } =
        parseEncryptArgs(rest);
      if (!inputArg || !outputArg || !passwordArg) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleEncrypt(
        currentDir,
        inputArg,
        outputArg,
        passwordArg,
      );
      if (result.ok) {
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    if (command === "decrypt") {
      const rest = line.trim().slice(command.length).trim();
      const { input: inputArg, output: outputArg, password: passwordArg } =
        parseEncryptArgs(rest);
      if (!inputArg || !outputArg || !passwordArg) {
        console.log(INVALID_INPUT_MESSAGE);
        return;
      }
      const result = await handleDecrypt(
        currentDir,
        inputArg,
        outputArg,
        passwordArg,
      );
      if (result.ok) {
        printCurrentDir(currentDir);
      } else {
        console.log(OPERATION_FAILED_MESSAGE);
      }
      return;
    }

    console.log(INVALID_INPUT_MESSAGE);
  };

  let commandPromise = Promise.resolve();
  rl.on("line", (line) => {
    commandPromise = commandPromise
      .then(() => processLine(line))
      .then(() => {
        if (!rl.closed) {
          rl.prompt();
        }
      })
      .catch((err) => {
        console.error(err);
        if (!rl.closed) {
          rl.prompt();
        }
      });
  });
  rl.on("close", () => {
    commandPromise
      .then(() => {
        console.log(GOODBYE_MESSAGE);
        process.exit(0);
      })
      .catch(() => {
        console.log(GOODBYE_MESSAGE);
        process.exit(0);
      });
  });

  process.on("SIGINT", () => {
    console.log("\n" + GOODBYE_MESSAGE);
    process.exit(0);
  });

  rl.setPrompt(PROMPT + " ");
  rl.prompt();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
