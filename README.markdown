# P2P Messaging Node with Express API

This project implements a peer-to-peer (P2P) messaging node using `libp2p` with TCP transport, Noise encryption, and Mplex stream multiplexing. It includes an Express.js server for managing peers and sending messages, with AES-256-CBC encryption for secure communication.

## Features
- **P2P Networking**: Establishes a libp2p node for peer-to-peer communication.
- **Secure Messaging**: Encrypts messages using AES-256-CBC before transmission.
- **Express API**: Provides endpoints to list connected peers and queue messages for broadcast.
- **Periodic Broadcast**: Sends a periodic "Hello, NET!" message to all connected peers every 5 seconds.
- **Message Queue**: Processes and broadcasts queued messages to all connected peers.

## Requirements
- Node.js >= 14.x
- npm or yarn for package management

## Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

## Dependencies
- `libp2p`: Core library for P2P networking.
- `libp2p-tcp`: TCP transport for libp2p.
- `@chainsafe/libp2p-noise`: Noise protocol for connection encryption.
- `libp2p-mplex`: Mplex stream multiplexer.
- `@multiformats/multiaddr`: Multiaddr format for peer addressing.
- `express`: Web server framework.
- `body-parser`: Middleware for parsing JSON requests.
- `crypto`: Node.js built-in module for AES encryption.

## Usage
1. Start the node and server:
   ```bash
   node index.js
   ```
   The node will start, display its multiaddresses, and run an HTTP server on `http://localhost:8000`.

2. **API Endpoints**:
   - **GET /peers**: Returns a list of connected peers with their IDs and last seen timestamps.
     ```bash
     curl http://localhost:8000/peers
     ```
   - **POST /send**: Queues a message for broadcast to all peers.
     ```bash
     curl -X POST http://localhost:8000/send -H "Content-Type: application/json" -d '{"content":"Your message here"}'
     ```

3. The node automatically:
   - Handles incoming connections and streams on the `/p2p/1.0.0` protocol.
   - Decrypts and logs received messages.
   - Broadcasts queued messages and periodic "Hello, NET!" messages.

## Security
- **Encryption**: Messages are encrypted using AES-256-CBC with a randomly generated key and IV.
- **Note**: The current implementation uses a single key and IV for all messages. In a production environment, consider using unique keys per session or peer for enhanced security.

## Project Structure
- `index.js`: Main application file containing the P2P node setup, Express server, and message handling logic.

## Notes
- The node listens on all available network interfaces (`/ip4/0.0.0.0/tcp/0`) with a dynamically assigned port.
- Peers are tracked in memory and removed when connections close or errors occur.
- Messages are queued and processed asynchronously to avoid blocking the main thread.

## Troubleshooting
- **Connection Issues**: Ensure no firewall rules block TCP connections on the assigned port.
- **Module Errors**: Verify all dependencies are installed correctly with `npm install`.
- **Encryption Errors**: Check that messages are valid base64-encoded strings before decryption.

## License
MIT License