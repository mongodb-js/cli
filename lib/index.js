var chalk = require('chalk');
var figures = require('figures');
var clui = require('clui');
var format = require('util').format;
var assert = require('assert');

if (process.env.EVERGREEN) {
  process.env.CI = process.env.EVERGREEN;
}

var ICON_TO_COLOR = {
  'tick': 'green',
  'warning': 'yellow',
  'cross': 'red',
  'info': 'gray'
};

function CLI() {
  this._spinner = null;
  this._section = [];
  this.debug = require('debug')('mongodb-js-cli');
}

CLI.prototype.spinner = function(msg) {
  this.debug(this.section(), msg + figures.ellipsis);
  if (process.env.CI) {
    // Don't show spinner's when running in CI
    // as it makes the build log utterly useless...
    console.log('%s: %s%s', this.section(), msg, figures.ellipsis);
    return this;
  }
  this.stopSpinner();
  this._spinner = new clui.Spinner(format('%s %s%s', this.section(), msg, figures.ellipsis));
  this._spinner.start();
  return this;
};

CLI.prototype.stopSpinner = function() {
  if (this._spinner) {
    this._spinner.stop();
  }
  return this;
};

CLI.prototype._printMessage = function(icon, msg) {
  this.stopSpinner();

  var color = ICON_TO_COLOR[icon] || 'white';
  /* eslint no-console:0 */
  if (!msg) {
    CLI.prototype.console.log(chalk.bold[color](figures[icon]), format(' %s', this.section()));
    return this;
  }

  console.log('%s %s %s', chalk.bold[color](figures[icon]), chalk.gray(this.decoratedSection()), msg);
  return this;
};

CLI.prototype.decoratedSection = function() {
  return (this.section() || '__main__').replace(/ /g, format('%s ', figures.pointerSmall));
};

CLI.prototype.section = function(name) {
  if (!name) {
    return this._section.length > 0 ? this._section.join(':') : null;
  }
  this._section = name;
  return this;
};

CLI.prototype.sectionEnd = function(name) {
  if (!this._section.length) {
    return null;
  }
  var previous = this._section.pop();
  assert.equal(previous, name);
  return this;
};

CLI.prototype.info = function(msg) {
  return this._printMessage('info', msg);
};

CLI.prototype.ok = function(msg) {
  return this._printMessage('tick', msg);
};

CLI.prototype.warn = function(msg) {
  return this._printMessage('warning', msg);
};

CLI.prototype.error = function(title, err) {
  this.stopSpinner();

  if (title instanceof Error) {
    err = title;
  }

  if (err) {
    console.error(chalk.red(figures.cross), ' Error:', title);
    err.stack.split('\n').map(function(line) {
      console.error(chalk.gray(line));
    });
    return this;
  }
  console.error(chalk.red(figures.cross), title);
  return this;
};

CLI.prototype.abortIfError = function(err) {
  if (!err) {
    return this;
  }
  this.error(err);
  process.exit(1);
};

CLI.prototype.abort = function(err) {
  this.error(err);
  process.exit(1);
};

Object.defineProperty(CLI.prototype, 'argv', {
  get: function() {
    if (!this._argv) {
      this._argv = this.yargs.argv;
    }
    return this._argv;
  },
  set: function(argv) {
    this._argv = argv;
  }
});

Object.defineProperty(CLI.prototype, 'yargs', {
  get: function() {
    if (!this._yargs) {
      this._yargs = require('yargs');
    }
    return this._yargs;
  }
});

module.exports = function(opts) {
  var cli = new CLI();
  if (typeof opts === 'string') {
    cli._section = opts.split(':');
  }
  return cli;
};

module.exports.CLI = CLI;
