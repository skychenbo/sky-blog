const SHA256 = require('crypto-js/sha256');

class CrytoBlock {
  constructor(index, timestamp, data, precedingHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.precedingHash = precedingHash;
    this.hash = this.computeHash();
    this.nouce = 0;
  }
  computeHash() {
    return SHA256(this.index + this.precedingHash + this.timestamp + JSON.stringify(this.data) + this.nouce).toString();
  }
}
