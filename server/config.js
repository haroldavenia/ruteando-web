module.exports = {
  TOKEN_SECRET: process.env.TOKEN_SECRET || 'A hard to guess string',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://hanoit:27017/hanoit',
  FACEBOOK_SECRET: process.env.FACEBOOK_SECRET || 'a8f88be480e34163e367f2fba0560b75',
  FOURSQUARE_SECRET: process.env.FOURSQUARE_SECRET || 'Foursquare Client Secret',
  GOOGLE_SECRET: process.env.GOOGLE_SECRET || 'J2TYN4UdEfTaWnqY1JtAVS6r',
  GITHUB_SECRET: process.env.GITHUB_SECRET || 'GitHub Client Secret',
  LINKEDIN_SECRET: process.env.LINKEDIN_SECRET || 'LinkedIn Client Secret',
  WINDOWS_LIVE_SECRET: process.env.WINDOWS_LIVE_SECRET || 'Windows Live Secret',
  TWITTER_KEY: process.env.TWITTER_KEY || 'Twitter Consumer Key',
  TWITTER_SECRET: process.env.TWITTER_SECRET || 'Twitter Consumer Secret',
  TWITTER_CALLBACK: process.env.TWITTER_CALLBACK || 'Twitter Callback URL',
  YAHOO_SECRET: process.env.YAHOO_SECRET || 'Yahoo Client Secret'
};