import { Plugin } from 'vite';
import * as chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

export function mirrorStatePlugin(): Plugin {
  return {
    name: 'vite-plugin-mirrorstate',
    configureServer(server) {
      // WebSocket server for client connections
      const wss = new WebSocketServer({ port: 8080 });
      
      // File watcher for *.mirror.json files
      const watcher = chokidar.watch('**/*.mirror.json', {
        ignored: /node_modules/,
        persistent: true
      });

      watcher.on('change', (filePath) => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          // Broadcast file change to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify({
                type: 'fileChange',
                name: path.basename(filePath, '.mirror.json'),
                state: data
              }));
            }
          });
          
          console.log(`Mirror file changed: ${filePath}`);
        } catch (error) {
          console.error(`Error reading mirror file ${filePath}:`, error);
        }
      });

      wss.on('connection', (ws) => {
        console.log('Client connected to MirrorState');
        
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            const { name, state } = data;
            
            // Write state to corresponding .mirror.json file
            const filePath = `${name}.mirror.json`;
            fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
            
            console.log(`Updated ${filePath} with state:`, state);
          } catch (error) {
            console.error('Error handling client message:', error);
          }
        });
      });
    }
  };
}

export default mirrorStatePlugin;
