import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { Send, Users, Circle, LogIn, PlusCircle, Paperclip, FileIcon, Download } from 'lucide-react';
import './App.css';

interface Message {
  id: string;
  type: 'text' | 'file';
  text?: string;
  file?: {
    data: any;
    name: string;
    type: string;
    url?: string;
  };
  sender: string;
  timestamp: number;
  isMe: boolean;
}

function App() {
  const [username, setUsername] = useState<string>(localStorage.getItem('username') || '');
  const [isRegistered, setIsRegistered] = useState<boolean>(!!username);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [isHost, setIsHost] = useState<boolean>(false);
  
  const peerRef = useRef<Peer | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRegistered) {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        setMyPeerId(id);
        setStatus('connecting');
      });

      peer.on('connection', (conn) => {
        if (connectionsRef.current.find(c => c.peer === conn.peer)) {
          conn.close();
          return;
        }
        handleIncomingConnection(conn);
      });

      return () => {
        peer.destroy();
      };
    }
  }, [isRegistered]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const processIncomingData = (data: any, fromPeer: string) => {
    const msg = data as Message;
    
    if (messagesRef.current.find(m => m.id === msg.id)) return;

    // Si c'est un fichier, on crée une URL locale pour l'affichage
    let processedMsg = { ...msg, isMe: false };
    if (msg.type === 'file' && msg.file) {
      const blob = new Blob([msg.file.data], { type: msg.file.type });
      processedMsg.file = { ...msg.file, url: URL.createObjectURL(blob) };
    }

    setMessages((prev) => [...prev, processedMsg]);

    // Relais par l'hôte
    if (isHost) {
      connectionsRef.current.forEach((c) => {
        if (c.peer !== fromPeer) {
          c.send(msg); // On renvoie le message original (avec les données brutes)
        }
      });
    }
  };

  const handleIncomingConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      if (connectionsRef.current.find(c => c.peer === conn.peer)) {
        conn.close();
        return;
      }
      setConnections((prev) => [...prev, conn]);
      setStatus('online');
    });

    conn.on('data', (data) => processIncomingData(data, conn.peer));

    conn.on('close', () => {
      setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));
    });
  };

  const startSalon = () => {
    setIsHost(true);
    setStatus('online');
  };

  const joinSalon = () => {
    if (!peerRef.current || !remotePeerId || remotePeerId === myPeerId) return;
    if (connectionsRef.current.find(c => c.peer === remotePeerId)) return;

    const conn = peerRef.current.connect(remotePeerId);
    handleIncomingConnection(conn);
    setIsHost(false);
  };

  const sendMessage = (type: 'text' | 'file', content?: any, fileInfo?: any) => {
    if (connections.length === 0 && !isHost) return;

    const msgData: Partial<Message> = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      sender: username,
      timestamp: Date.now(),
    };

    if (type === 'text') {
      msgData.text = content;
    } else {
      msgData.file = fileInfo;
    }

    // Envoi
    connections.forEach((conn) => {
      if (conn.open) conn.send(msgData);
    });

    // Affichage local
    const localMsg = { ...msgData, isMe: true } as Message;
    if (type === 'file' && fileInfo.data) {
      const blob = new Blob([fileInfo.data], { type: fileInfo.type });
      localMsg.file = { ...fileInfo, url: URL.createObjectURL(blob) };
    }

    setMessages((prev) => [...prev, localMsg]);
    if (type === 'text') setInputText('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      sendMessage('file', null, {
        data: reader.result,
        name: file.name,
        type: file.type
      });
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.type === 'text') return msg.text;

    if (msg.file) {
      const isImage = msg.file.type.startsWith('image/');
      const isVideo = msg.file.type.startsWith('video/');

      if (isImage && msg.file.url) {
        return <img src={msg.file.url} alt={msg.file.name} className="media-preview" />;
      }
      if (isVideo && msg.file.url) {
        return <video src={msg.file.url} controls className="media-preview" />;
      }

      return (
        <div className="file-attachment">
          <FileIcon size={20} />
          <span className="file-name">{msg.file.name}</span>
          <a href={msg.file.url} download={msg.file.name} className="download-btn">
            <Download size={16} />
          </a>
        </div>
      );
    }
    return null;
  };

  if (!isRegistered) {
    return (
      <div className="setup-screen">
        <form className="setup-card" onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) {
            localStorage.setItem('username', username);
            setIsRegistered(true);
          }
        }}>
          <h1>Discufion</h1>
          <p>Entrez un pseudo pour commencer.</p>
          <div className="join-form">
            <input
              type="text"
              placeholder="Votre pseudo..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <button type="submit">Entrer</button>
          </div>
        </form>
      </div>
    );
  }

  if (status === 'connecting' && connections.length === 0 && !isHost) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <Users size={48} color="#3b82f6" style={{ marginBottom: '1rem' }} />
          <h1>Salut, {username}</h1>
          <div className="join-form">
            <button onClick={startSalon} className="secondary">
              <PlusCircle size={18} style={{ marginRight: '0.5rem' }} /> Créer un salon
            </button>
            <div style={{ margin: '0.5rem', opacity: 0.5 }}>OU</div>
            <input
              type="text"
              placeholder="ID du salon..."
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
            />
            <button onClick={joinSalon} disabled={!remotePeerId}>
              <LogIn size={18} style={{ marginRight: '0.5rem' }} /> Rejoindre
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1>Discufion</h1>
          <div className="salon-id" onClick={() => {
            const id = isHost ? myPeerId : (connections[0]?.peer || '');
            if (id) { navigator.clipboard.writeText(id); alert('ID copié !'); }
          }}>
            Salon : <span>{isHost ? myPeerId : (connections[0]?.peer || '...')}</span>
            {isHost && <small> (Hôte)</small>}
          </div>
        </div>
        <div className="status">
          <Circle size={8} className="status-dot online" fill="currentColor" />
          <span>{connections.length + 1} en ligne</span>
        </div>
      </header>

      <div className="chat-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.isMe ? 'sent' : 'received'}`}>
            {!msg.isMe && <div className="message-sender">{msg.sender}</div>}
            {renderMessageContent(msg)}
            <div className="message-info">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
          <Paperclip size={20} />
        </button>
        <input
          type="text"
          placeholder="Message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage('text', inputText)}
        />
        <button onClick={() => sendMessage('text', inputText)} disabled={!inputText.trim()}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

export default App;
