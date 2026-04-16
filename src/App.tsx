import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { Send, Users, Circle, LogIn, PlusCircle } from 'lucide-react';
import './App.css';

interface Message {
  id: string;
  text: string;
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

  useEffect(() => {
    if (isRegistered) {
      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', (id) => {
        setMyPeerId(id);
        setStatus('connecting');
      });

      peer.on('connection', (conn) => {
        // Empêcher les doublons de connexion
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

  const handleIncomingConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      // Double vérification à l'ouverture
      if (connectionsRef.current.find(c => c.peer === conn.peer)) {
        conn.close();
        return;
      }
      setConnections((prev) => [...prev, conn]);
      setStatus('online');
    });

    conn.on('data', (data: any) => {
      const msg = data as { text: string; sender: string; id: string; timestamp: number };
      
      // Déduplication des messages par ID
      if (messagesRef.current.find(m => m.id === msg.id)) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        { ...msg, isMe: false },
      ]);

      // Relais seulement si je suis l'hôte
      if (isHost) {
        connectionsRef.current.forEach((c) => {
          if (c.peer !== conn.peer) {
            c.send(msg);
          }
        });
      }
    });

    conn.on('close', () => {
      setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));
    });

    conn.on('error', () => {
      setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));
    });
  };

  const startSalon = () => {
    setIsHost(true);
    setStatus('online');
  };

  const joinSalon = () => {
    if (!peerRef.current || !remotePeerId) return;
    
    // Ne pas se connecter à soi-même
    if (remotePeerId === myPeerId) return;

    // Ne pas se connecter si déjà connecté
    if (connectionsRef.current.find(c => c.peer === remotePeerId)) return;

    const conn = peerRef.current.connect(remotePeerId);
    handleIncomingConnection(conn);
    setIsHost(false);
  };

  const sendMessage = () => {
    if (connections.length === 0 && !isHost) return;
    if (!inputText.trim()) return;

    const msgData = {
      id: Math.random().toString(36).substr(2, 9),
      text: inputText,
      sender: username,
      timestamp: Date.now(),
    };

    connections.forEach((conn) => {
      if (conn.open) {
        conn.send(msgData);
      }
    });

    setMessages((prev) => [...prev, { ...msgData, isMe: true }]);
    setInputText('');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem('username', username);
      setIsRegistered(true);
    }
  };

  if (!isRegistered) {
    return (
      <div className="setup-screen">
        <form className="setup-card" onSubmit={handleRegister}>
          <h1>Bienvenue sur Discufion</h1>
          <p>Choisissez un pseudonyme pour commencer.</p>
          <div className="join-form">
            <input
              type="text"
              placeholder="Votre pseudo..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <button type="submit">Commencer</button>
          </div>
        </form>
      </div>
    );
  }

  if (status === 'connecting' && connections.length === 0 && !isHost) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Users size={48} color="#3b82f6" />
          </div>
          <h1>Bonjour, {username}</h1>
          <p>Créez un salon ou rejoignez-en un existant.</p>
          
          <div className="join-form">
            <button onClick={startSalon} className="secondary">
              <PlusCircle size={18} style={{ marginRight: '0.5rem' }} />
              Créer un nouveau salon
            </button>
            
            <div style={{ margin: '1rem 0', opacity: 0.5 }}>OU</div>

            <input
              type="text"
              placeholder="ID du salon (ID de l'hôte)..."
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
            />
            <button onClick={joinSalon} disabled={!remotePeerId}>
              <LogIn size={18} style={{ marginRight: '0.5rem' }} />
              Rejoindre le salon
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
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
            ID Salon : <span 
              onClick={() => {
                const id = isHost ? myPeerId : (connections[0]?.peer || '');
                if (id) {
                  navigator.clipboard.writeText(id);
                  alert('ID copié !');
                }
              }}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isHost ? myPeerId : (connections[0]?.peer || 'Chargement...')}
            </span>
            {isHost && <span style={{ marginLeft: '0.5rem', color: '#3b82f6' }}>(Hôte)</span>}
          </div>
        </div>
        <div className="status">
          <Circle size={8} className={`status-dot online`} fill="currentColor" />
          <span>{connections.length} participant(s) connecté(s)</span>
        </div>
      </header>

      <div className="chat-area">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.isMe ? 'sent' : 'received'}`}>
            {!msg.isMe && <div style={{ fontWeight: 'bold', fontSize: '0.7rem', marginBottom: '0.2rem' }}>{msg.sender}</div>}
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
          placeholder="Écrivez un message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={!inputText.trim()}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

export default App;
