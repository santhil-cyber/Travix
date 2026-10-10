const crypto = require('crypto');

class Block {
    /**
     * @param {number} timestamp - The time the block was created.
     * @param {object} data - The data to be stored in the block (e.g., transaction details).
     * @param {string} previousHash - The hash of the previous block in the chain.
     */
    constructor(timestamp, data, previousHash = '') {
        this.timestamp = timestamp;
        this.data = data;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = 0; // A random number used in mining.
    }

    /**
     * Calculates the SHA256 hash of the block's contents.
     * The hash is a unique fingerprint.
     */
    calculateHash() {
        return crypto.createHash('sha256').update(this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce).digest('hex');
    }

    /**
     * Implements Proof-of-Work.
     * Repeatedly calculates the hash with a new 'nonce' until the hash
     * starts with a specific number of zeros (the 'difficulty').
     * @param {number} difficulty - The number of leading zeros required for a valid hash.
     */
    mineBlock(difficulty) {
        const target = Array(difficulty + 1).join("0");
        while (this.hash.substring(0, difficulty) !== target) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log(`BLOCK MINED: ${this.hash}`);
    }
}

class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4; // Difficulty can be adjusted. Higher is more secure but slower.
    }

    /**
     * Creates the very first block in the chain, known as the Genesis Block.
     */
    createGenesisBlock() {
        return new Block(Date.parse("2025-01-01"), "Genesis Block", "0");
    }

    /**
     * A helper function to get the most recent block on the chain.
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Adds a new block to the blockchain after ensuring it has been mined.
     * @param {Block} newBlock - The new block to be added.
     */
    addBlock(newBlock) {
        newBlock.previousHash = this.getLatestBlock().hash;
        console.log(`Mining new block with data: ${JSON.stringify(newBlock.data)}...`);
        newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);
    }

    /**
     * Verifies the integrity of the entire blockchain.
     * @returns {boolean} - True if the chain is valid, false otherwise.
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];

            // 1. Check if the hash of the current block is correct
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                console.error(`Invalid hash for block ${i}: ${currentBlock.hash}`);
                return false;
            }

            // 2. Check if the block points to the correct previous block
            if (currentBlock.previousHash !== previousBlock.hash) {
                console.error(`Chain broken at block ${i}. Previous hash does not match.`);
                return false;
            }
        }
        return true;
    }
}

// Export the classes to be used by our server.js file
module.exports.Blockchain = Blockchain;
module.exports.Block = Block;