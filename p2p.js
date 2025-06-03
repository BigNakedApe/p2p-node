const Libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const Noise = require('@chainsafe/libp2p-noise');
const Mplex = require('libp2p-mplex');
const { multiaddr } = require('@multiformats/multiaddr');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
const peers = new Map();
const messageQueue = [];

const AES_KEY = crypto.randomBytes(32); // 256-bit key
const AES_IV = crypto.randomBytes(16);  // 128-bit IV

function encryptMessage(message) {
  const cipher = crypto.createCipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let encrypted = cipher.update(message, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

function decryptMessage(encrypted) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', AES_KEY, AES_IV);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function createNode() {
  const node = await Libp2p.create({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0']
    },
    modules: {
      transport: [TCP],
      connEncryption: [Noise],
      streamMuxer: [Mplex]
    }
  });

  node.handle('/p2p/1.0.0', async ({ stream, connection }) => {
    const peerId = connection.remotePeer.toString();
    peers.set(peerId, { peerId, lastSeen: Date.now() });
    console.log(`Connected to peer: ${peerId}`);

    try {
      let data = '';
      stream.on('data', (chunk) => {
        data += chunk.toString();
      });
      stream.on('end', () => {
        try {
          const decrypted = decryptMessage(data);
          console.log(`Received from ${peerId}: ${decrypted}`);
        } catch (e) {
          console.error(`Error decrypting from ${peerId}: ${e.message}`);
        }
      });
      stream.on('error', (err) => {
        console.error(`Stream error with ${peerId}: ${err.message}`);
      });
      stream.on('close', () => {
        peers.delete(peerId);
        console.log(`Disconnected from peer: ${peerId}`);
      });
    } catch (err) {
      console.error(`Error handling stream from ${peerId}: ${err.message}`);
      peers.delete(peerId);
    }
  });

  return node;
}

async function sendHello(node) {
  const protocolId = '/p2p/1.0.0';
  setInterval(async () => {
    for (const [peerId, peerInfo] of peers) {
      try {
        const { stream } = await node.dialProtocol(peerInfo.peerId, protocolId);
        const encrypted = encryptMessage('Hello, NET!');
        stream.write(Buffer.from(encrypted));
        stream.end();
      } catch (err) {
        console.error(`Error sending to ${peerId}: ${err.message}`);
        peers.delete(peerId);
      }
    }
  }, 5000);
}

async function processQueue(node) {
  const protocolId = '/p2p/1.0.0';
  while (true) {
    if (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      for (const [peerId, peerInfo] of peers) {
        try {
          const { stream } = await node.dialProtocol(peerInfo.peerId, protocolId);
          const encrypted = encryptMessage(msg);
          stream.write(Buffer.from(encrypted));
          stream.end();
        } catch (err) {
          console.error(`Error broadcasting to ${peerId}: ${err.message}`);
          peers.delete(peerId);
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

app.get('/peers', (req, res) => {
  res.json({
    peers: Array.from(peers.entries()).map(([id, info]) => ({
      id,
      last_seen: info.lastSeen / 1000
    }))
  });
});

app.post('/send', (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  messageQueue.push(content);
  res.json({ status: 'Message queued for broadcast' });
});

async function main() {
  const node = await createNode();
  await node.start();
  console.log(`Node started, listening on: ${node.multiaddrs.map(addr => addr.toString())}`);
  console.log(`Peer ID: ${node.peerId.toString()}`);

  sendHello(node);
  processQueue(node);

  app.listen(8000, () => {
    console.log('HTTP server running on http://localhost:8000');
  });
}

main().catch(console.error);
