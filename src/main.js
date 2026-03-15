/**
 * Entry point: sets up REPL and handles navigation state.
 */
const path = require("path");
const os = require("os");

const { runRepl } = require("./repl");

const run = async () => {
  const state = {
    currentDir: path.resolve(os.homedir()),
  };
  runRepl(state);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
