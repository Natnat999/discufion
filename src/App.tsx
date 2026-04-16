import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import { Send, Circle, LogIn, PlusCircle, Paperclip, FileIcon, Download, Settings, X, Image as ImageIcon, User } from 'lucide-react';
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
  senderAvatar?: string;
  timestamp: number;
  isMe: boolean;
}

function App() {
  const [username, setUsername] = useState<string>(localStorage.getItem('username') || '');
  const [avatar, setAvatar] = useState<string>(localStorage.getItem('avatar') || '');
  const [chatBg, setChatBg] = useState<string>(localStorage.getItem('chatBg') || '');
  const [isRegistered, setIsRegistered] = useState<boolean>(!!username);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<'offline' | 'connecting' | 'online'>('offline');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const messagesRef = useRef<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRegistered) {
      const peer = new Peer();
      peerRef.current = peer;
      peer.on('open', (id) => { setMyPeerId(id); setStatus('connecting'); });
      peer.on('connection', (conn) => {
        if (connectionsRef.current.find(c => c.peer === conn.peer)) { conn.close(); return; }
        handleIncomingConnection(conn);
      });
      return () => peer.destroy();
    }
  }, [isRegistered]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const processIncomingData = (data: any, fromPeer: string) => {
    const msg = data as Message;
    if (messagesRef.current.find(m => m.id === msg.id)) return;

    let processedMsg = { ...msg, isMe: false };
    if (msg.type === 'file' && msg.file) {
      const blob = new Blob([msg.file.data], { type: msg.file.type });
      processedMsg.file = { ...msg.file, url: URL.createObjectURL(blob) };
    }
    setMessages((prev) => [...prev, processedMsg]);

    if (isHost) {
      connectionsRef.current.forEach((c) => {
        if (c.peer !== fromPeer) c.send(msg);
      });
    }
  };

  const handleIncomingConnection = (conn: DataConnection) => {
    conn.on('open', () => {
      if (connectionsRef.current.find(c => c.peer === conn.peer)) { conn.close(); return; }
      setConnections((prev) => [...prev, conn]);
      setStatus('online');
    });
    conn.on('data', (data) => processIncomingData(data, conn.peer));
    conn.on('close', () => setConnections((prev) => prev.filter((c) => c.peer !== conn.peer)));
  };

  const sendMessage = (type: 'text' | 'file', content?: any, fileInfo?: any) => {
    if (connections.length === 0 && !isHost) return;
    const msgData: Partial<Message> = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      sender: username,
      senderAvatar: avatar,
      timestamp: Date.now(),
    };
    if (type === 'text') msgData.text = content;
    else msgData.file = fileInfo;

    connections.forEach((conn) => { if (conn.open) conn.send(msgData); });

    const localMsg = { ...msgData, isMe: true } as Message;
    if (type === 'file' && fileInfo.data) {
      const blob = new Blob([fileInfo.data], { type: fileInfo.type });
      localMsg.file = { ...fileInfo, url: URL.createObjectURL(blob) };
    }
    setMessages((prev) => [...prev, localMsg]);
    if (type === 'text') setInputText('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'bg') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (type === 'avatar') { setAvatar(result); localStorage.setItem('avatar', result); }
      else { setChatBg(result); localStorage.setItem('chatBg', result); }
    };
    reader.readAsDataURL(file);
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.type === 'text') return msg.text;
    if (msg.file) {
      const isImage = msg.file.type.startsWith('image/');
      const isVideo = msg.file.type.startsWith('video/');
      if (isImage && msg.file.url) return <img src={msg.file.url} alt={msg.file.name} className="media-preview" />;
      if (isVideo && msg.file.url) return <video src={msg.file.url} controls className="media-preview" />;
      return (
        <div className="file-attachment">
          <FileIcon size={20} />
          <span className="file-name">{msg.file.name}</span>
          <a href={msg.file.url} download={msg.file.name} className="download-btn"><Download size={16} /></a>
        </div>
      );
    }
    return null;
  };

  if (!isRegistered) {
    return (
      <div className="setup-screen">
        <form className="setup-card" onSubmit={(e) => { e.preventDefault(); if (username.trim()) { localStorage.setItem('username', username); setIsRegistered(true); } }}>
          <h1>Discufion</h1>
          <div className="avatar-upload-preview" onClick={() => avatarInputRef.current?.click()}>
            {avatar ? <img src={avatar} alt="Avatar" /> : <User size={40} />}
            <div className="overlay"><PlusCircle size={20} /></div>
          </div>
          <input type="file" hidden ref={avatarInputRef} accept="image/*" onChange={(e) => handleImageUpload(e, 'avatar')} />
          <p>Choisissez votre profil</p>
          <div className="join-form">
            <input type="text" placeholder="Votre pseudo..." value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
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
          <div className="user-profile-header">
            {avatar && <img src={avatar} className="small-avatar" alt="" />}
            <h2>Salut, {username}</h2>
          </div>
          <div className="join-form">
            <button onClick={() => setIsHost(true)} className="secondary"><PlusCircle size={18} /> Créer un salon</button>
            <div style={{ margin: '0.5rem', opacity: 0.5 }}>OU</div>
            <input type="text" placeholder="ID du salon..." value={remotePeerId} onChange={(e) => setRemotePeerId(e.target.value)} />
            <button onClick={() => { if (peerRef.current && remotePeerId) handleIncomingConnection(peerRef.current.connect(remotePeerId)); setIsHost(false); }} disabled={!remotePeerId}><LogIn size={18} /> Rejoindre</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <h1>Discufion</h1>
          <div className="salon-id" onClick={() => { const id = isHost ? myPeerId : (connections[0]?.peer || ''); if (id) { navigator.clipboard.writeText(id); alert('ID copié !'); } }}>
            ID : <span>{isHost ? myPeerId : (connections[0]?.peer || '...')}</span>
          </div>
        </div>
        <div className="header-right">
          <div className="status">
            <Circle size={8} className="status-dot online" fill="currentColor" />
            <span>{connections.length + 1}</span>
          </div>
          <button className="icon-btn settings-toggle" onClick={() => setShowSettings(true)}><Settings size={20} /></button>
        </div>
      </header>

      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-panel">
            <div className="settings-header">
              <h3>Paramètres</h3>
              <button className="icon-btn" onClick={() => setShowSettings(false)}><X size={20} /></button>
            </div>
            <div className="settings-content">
              <div className="setting-item">
                <label>Avatar</label>
                <div className="avatar-edit" onClick={() => avatarInputRef.current?.click()}>
                  {avatar ? <img src={avatar} alt="" /> : <User size={24} />}
                </div>
              </div>
              <div className="setting-item">
                <label>Fond d'écran</label>
                <button className="secondary" onClick={() => bgInputRef.current?.click()}><ImageIcon size={18} /> Choisir une image</button>
                {chatBg && <button className="danger-text" onClick={() => { setChatBg(''); localStorage.removeItem('chatBg'); }}>Supprimer</button>}
              </div>
              <input type="file" hidden ref={bgInputRef} accept="image/*" onChange={(e) => handleImageUpload(e, 'bg')} />
            </div>
          </div>
        </div>
      )}

      <div className="chat-area" style={{ backgroundImage: chatBg ? `url(${chatBg})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message-wrapper ${msg.isMe ? 'me' : 'them'}`}>
            {!msg.isMe && (
              <div className="msg-avatar">
                {msg.senderAvatar ? <img src={msg.senderAvatar} alt="" /> : <div className="avatar-placeholder">{msg.sender[0]}</div>}
              </div>
            )}
            <div className={`message ${msg.isMe ? 'sent' : 'received'}`}>
              {!msg.isMe && <div className="message-sender">{msg.sender}</div>}
              {renderMessageContent(msg)}
              <div className="message-info">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input type="file" hidden ref={fileInputRef} onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const r = new FileReader();
            r.onload = () => sendMessage('file', null, { data: r.result, name: file.name, type: file.type });
            r.readAsArrayBuffer(file);
          }
        }} />
        <button className="icon-btn" onClick={() => fileInputRef.current?.click()}><Paperclip size={20} /></button>
        <input type="text" placeholder="Message..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage('text', inputText)} />
        <button onClick={() => sendMessage('text', inputText)} disabled={!inputText.trim()}><Send size={20} /></button>
      </div>
    </div>
  );
}

export default App;
