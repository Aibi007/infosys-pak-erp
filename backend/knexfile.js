'use strict';
require('dotenv').config();
const { baseConfig } = require('./config/database');

module.exports = {
  development: {
    ...baseConfig,
  },

  production: {
    ...baseConfig,
  },
};
