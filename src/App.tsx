import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { Send, Copy, Users, Circle } from 'lucide-react';
import './App.css';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  timestamp: number;
}

function App() {
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const peerRef = useRef<Peer | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Peer
    const peer = new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setMyPeerId(id);
      setStatus('connecting');
    });

    peer.on('connection', (conn) => {
      handleConnection(conn);
    });

    return () => {
      peer.destroy();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      setConnection(conn);
      setStatus('online');
      setRemotePeerId(conn.peer);
    });

    conn.on('data', (data: any) => {
      if (typeof data === 'string') {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substr(2, 9),
            text: data,
            sender: 'them',
            timestamp: Date.now(),
          },
        ]);
      }
    });

    conn.on('close', () => {
      setStatus('connecting');
      setConnection(null);
    });

    conn.on('error', () => {
      setStatus('connecting');
      setConnection(null);
    });
  };

  const connectToPeer = () => {
    if (!peerRef.current || !remotePeerId) return;
    const conn = peerRef.current.connect(remotePeerId);
    handleConnection(conn);
  };

  const sendMessage = () => {
    if (!connection || !inputText.trim()) return;

    connection.send(inputText);
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        text: inputText,
        sender: 'me',
        timestamp: Date.now(),
      },
    ]);
    setInputText('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(myPeerId);
    alert('Peer ID copied!');
  };

  if (status === 'connecting' && !connection) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Users size={48} color="#3b82f6" />
          </div>
          <h1>Discufion</h1>
          <p>Share your ID with a peer or join one via their ID.</p>
          
          <div className="peer-id-display" onClick={copyToClipboard} title="Click to copy">
            {myPeerId || 'Generating...'} <Copy size={14} style={{ marginLeft: '0.5rem' }} />
          </div>

          <div className="join-form">
            <input
              type="text"
              placeholder="Enter Peer ID to join..."
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && connectToPeer()}
            />
            <button onClick={connectToPeer} disabled={!remotePeerId}>
              Join Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>Discufion</h1>
        <div className="status">
          <Circle size={8} className={`status-dot ${status === 'online' ? 'online' : ''}`} fill="currentColor" />
          <span>{status === 'online' ? 'Connected' : 'Waiting for peer...'}</span>
        </div>
      </header>

      <div className="chat-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.text}
            <div className="message-info">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={!inputText.trim() || status !== 'online'}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

export default App;
