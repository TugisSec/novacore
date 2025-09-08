import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// Optimize icon imports - only import what we need
import { 
  Settings, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sun, 
  Moon, 
  Image, 
  X, 
  Plus, 
  Menu, 
  Trash2,
  FileText 
} from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
interface Message {
  id: string;
  content: string | Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
  role: 'user' | 'assistant';
  timestamp: Date;
  image?: string; // Store the image data for display
}
interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
const OpenAIChatbot = () => {
  const {
    theme,
    setTheme
  } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    content: 'Hello! I\'m your AI assistant powered by OpenAI. How can I help you today?',
    role: 'assistant',
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai-api-key') || '');
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typing animation effect
  useEffect(() => {
    const welcomeText = 'Welcome to NovaCore AI';
    let currentIndex = 0;
    const startTyping = () => {
      setIsTyping(true);
      setTypedText('');
      const typeInterval = setInterval(() => {
        if (currentIndex < welcomeText.length) {
          setTypedText(prev => prev + welcomeText[currentIndex]);
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 100); // Adjust speed here (100ms per character)

      return () => clearInterval(typeInterval);
    };

    // Start typing animation after a short delay
    const timeout = setTimeout(startTyping, 500);
    return () => clearTimeout(timeout);
  }, []);

  // Load chat sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('chat-sessions');
    if (savedSessions) {
      const sessions: ChatSession[] = JSON.parse(savedSessions).map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setChatSessions(sessions);
      
      // Load the most recent session
      if (sessions.length > 0) {
        const mostRecentSession = sessions[0];
        setCurrentSessionId(mostRecentSession.id);
        setMessages(mostRecentSession.messages);
      }
    } else {
      // Only create a new chat if no sessions exist
      createNewChat();
    }
  }, []);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('chat-sessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  // Update current session messages when messages change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setChatSessions(prev => prev.map(session => session.id === currentSessionId ? {
        ...session,
        messages,
        updatedAt: new Date(),
        title: session.messages.length === 1 ? getSessionTitle(messages) : session.title
      } : session));
    }
  }, [messages, currentSessionId]);
  const getSessionTitle = (msgs: Message[]) => {
    const firstUserMessage = msgs.find(msg => msg.role === 'user');
    if (firstUserMessage && typeof firstUserMessage.content === 'string') {
      return firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
    }
    return `Chat ${new Date().toLocaleDateString()}`;
  };
  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{
        id: '1',
        content: 'WELCOME_MESSAGE',
        role: 'assistant',
        timestamp: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages(newSession.messages);
  };
  const switchToChat = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
  };
  const deleteChat = (sessionId: string) => {
    setChatSessions(prev => {
      const newSessions = prev.filter(s => s.id !== sessionId);

      // If we deleted the current session, switch to another one
      if (sessionId === currentSessionId) {
        if (newSessions.length > 0) {
          const lastSession = newSessions[newSessions.length - 1];
          setCurrentSessionId(lastSession.id);
          setMessages(lastSession.messages);
        } else {
          // Create a new chat if no sessions left
          setTimeout(() => createNewChat(), 0);
        }
      }
      return newSessions;
    });
    toast.success('Chat deleted');
  };
  useEffect(() => {
    setMounted(true);
  }, []);
  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    const scrollToEnd = () => {
      if (scrollAreaRef.current) {
        // For ScrollArea component
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          // Force scroll to the very bottom
          scrollContainer.scrollTop = scrollContainer.scrollHeight + 1000;
          // Multiple attempts with increasing delays
          setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight + 1000;
          }, 20);
          setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight + 1000;
          }, 100);
          setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight + 1000;
          }, 200);
        } else {
          // For regular div fallback
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight + 1000;
          setTimeout(() => {
            scrollAreaRef.current!.scrollTop = scrollAreaRef.current!.scrollHeight + 1000;
          }, 20);
          setTimeout(() => {
            scrollAreaRef.current!.scrollTop = scrollAreaRef.current!.scrollHeight + 1000;
          }, 100);
          setTimeout(() => {
            scrollAreaRef.current!.scrollTop = scrollAreaRef.current!.scrollHeight + 1000;
          }, 200);
        }
      }
    };

    // Immediate scroll to end when new messages appear
    scrollToEnd();
  }, [messages.length, isLoading]); // Watch message count and loading state
  const toggleTheme = () => {
    console.log('Toggle clicked! Current theme:', theme);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    console.log('Setting theme to:', newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };
  const saveApiKey = () => {
    if (!tempApiKey.trim()) {
      toast.error('Please enter a valid OpenAI API key');
      return;
    }
    if (!tempApiKey.startsWith('sk-')) {
      toast.error('OpenAI API keys should start with "sk-"');
      return;
    }
    localStorage.setItem('openai-api-key', tempApiKey);
    setApiKey(tempApiKey);
    setIsSettingsOpen(false);
    toast.success('API key saved successfully!');
  };
  const sendMessage = async () => {
    if (!input.trim() && !uploadedImage) return;
    if (!apiKey) {
      toast.error('Please set your OpenAI API key in settings first');
      setIsSettingsOpen(true);
      return;
    }
    const currentImage = uploadedImage;

    // Remove welcome message when starting conversation
    const filteredMessages = messages.filter(msg => msg.content !== 'WELCOME_MESSAGE');
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim() || "Image uploaded",
      role: 'user',
      timestamp: new Date(),
      image: currentImage || undefined
    };
    const newMessages = [...filteredMessages, userMessage];
    setMessages(newMessages);
    setInput('');
    setUploadedImage(null); // Clear the uploaded image after sending
    setIsLoading(true);
    try {
      // Prepare messages for API
      const apiMessages = newMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // If there's an uploaded image, modify the last message to include it
      if (currentImage) {
        const lastMessage = apiMessages[apiMessages.length - 1];
        lastMessage.content = [{
          type: "text",
          text: input.trim() || "What do you see in this image?"
        }, {
          type: "image_url",
          image_url: {
            url: currentImage
          }
        }];
      }
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: apiMessages,
          stream: false,
          max_tokens: 2000,
          temperature: 0.7
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response from OpenAI');
      }
      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.choices[0].message.content,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      toast.success('Response received!');
    } catch (error) {
      console.error('OpenAI API error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const renderMessageContent = (content: string | Array<{
    type: string;
    text?: string;
    image_url?: {
      url: string;
    };
  }>) => {
    if (typeof content === 'string') {
      return content;
    }

    // For multimodal content, just return the text part for display
    const textPart = content.find(item => item.type === 'text');
    return textPart?.text || 'Image uploaded';
  };
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return (
    <div className="h-screen flex bg-background transition-colors">
      {/* Sidebar - Chat History - Fixed */}
      <div className={`${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'} transition-all duration-300 border-r border-border bg-card flex flex-col fixed left-0 top-0 h-full z-40`}>
        {/* Sidebar Header */}
        <div className="px-4 py-8 border-b border-border bg-card h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img 
              src="/lovable-uploads/bf2320b5-8643-4c03-8f78-b4949293424c.png" 
              alt="Nova Core Logo" 
              className="h-16 w-16"
              loading="lazy"
            />
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSidebarCollapsed(true)} 
            className="h-8 w-8 p-0 hover:bg-muted transition-colors" 
            title="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Chat History */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1 mt-6">
            {/* Chat History Title at top of list */}
            <h2 className="font-semibold text-foreground mb-3 px-2 mt-4">Chat History</h2>
            
            {/* New Chat Button */}
            <Button onClick={createNewChat} className="w-full flex items-center gap-2 mb-3" variant="outline">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
            
            {chatSessions.map(session => <div key={session.id} className={`group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all duration-300 ease-out hover:scale-105 ${session.id === currentSessionId ? 'bg-muted text-black dark:text-primary' : 'hover:bg-muted/50 text-black dark:text-muted-foreground hover:text-black dark:hover:text-foreground'}`} onClick={() => switchToChat(session.id)}>
                <span className="flex-1 text-sm truncate">{session.title}</span>
                {chatSessions.length > 1 && <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 transition-all duration-200 hover:scale-110 active:scale-95" onClick={e => {
              e.stopPropagation();
              // Add click animation and fade-out effect
              const chatElement = e.currentTarget.closest('.group') as HTMLElement;
              const deleteButton = e.currentTarget as HTMLElement;

              // Animate delete button click
              deleteButton.classList.add('animate-pulse');
              if (chatElement) {
                // Add fade-out and slide-out animation
                chatElement.style.transform = 'translateX(-100%)';
                chatElement.style.opacity = '0';
                chatElement.style.transition = 'all 0.3s ease-out';
                setTimeout(() => deleteChat(session.id), 300);
              } else {
                deleteChat(session.id);
              }
            }}>
                    <Trash2 className="h-3 w-3 transition-all duration-200" />
                  </Button>}
              </div>)}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area - Fixed Layout */}
      <div className={`flex-1 flex flex-col ${sidebarCollapsed ? 'ml-0' : 'ml-80'} transition-all duration-300`}>
        <div className={`flex-1 flex flex-col ${messages.every(msg => msg.content === 'WELCOME_MESSAGE') ? 'h-screen overflow-hidden' : ''}`}>
          {/* Header - Fixed */}
          <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between fixed top-0 right-0 z-30" style={{
          left: sidebarCollapsed ? '0' : '320px'
        }}>
            <div className="flex items-center gap-3">
              {sidebarCollapsed && <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(false)} className="h-10 w-10 hover:bg-accent transition-colors" title="Open sidebar">
                  <Menu className="h-5 w-5" />
                </Button>}
              <div>
                <h1 className="text-xl font-semibold text-card-foreground">NovaCore</h1>
                <p className="text-xs text-muted-foreground">Powered by OpenAI GPT</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-10 w-10 hover:bg-accent transition-colors" title={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}>
                {!mounted ? <div className="h-5 w-5 animate-pulse bg-muted rounded" /> : theme === 'dark' ? <Sun className="h-5 w-5 transition-all" /> : <Moon className="h-5 w-5 transition-all" />}
              </Button>
              
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="sm:px-4 px-2">
                    <Settings className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">API Settings</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="api-key">OpenAI API Key</Label>
                      <Input id="api-key" type="password" placeholder="sk-..." value={tempApiKey} onChange={e => setTempApiKey(e.target.value)} />
                      <p className="text-sm text-muted-foreground">
                        Your API key is stored locally and never sent to our servers.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveApiKey}>
                        Save API Key
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </header>

          {/* Chat Messages - Adjusted for fixed header */}
          {messages.every(msg => msg.content === 'WELCOME_MESSAGE') ? <div className="flex-1 p-4 pt-20 overflow-hidden pointer-events-none select-none" ref={scrollAreaRef}>
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map(message => {
              // Special case for welcome message
              if (message.content === 'WELCOME_MESSAGE') {
                return <div key={message.id} className="flex justify-center items-center h-screen">
                        <h1 className="text-4xl font-bold text-foreground text-center">
                          {typedText}
                          {isTyping && <span className="animate-pulse">|</span>}
                        </h1>
                      </div>;
              }
              return null;
            })}
              </div>
            </div> : <ScrollArea className="flex-1 p-4 pt-20" ref={scrollAreaRef}>
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map(message => {
              // Special case for welcome message
              if (message.content === 'WELCOME_MESSAGE') {
                return <div key={message.id} className="flex justify-center items-center h-screen">
                      <h1 className="text-4xl font-bold text-foreground text-center">
                        {typedText}
                        {isTyping && <span className="animate-pulse">|</span>}
                      </h1>
                    </div>;
              }
              return <div key={message.id} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in transform transition-all duration-300 ease-out`}>
                    <Card className={`max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] xl:max-w-[65%] p-3 sm:p-4 transform hover:scale-105 transition-all duration-200 ${message.role === 'user' ? 'bg-message-received text-message-received-foreground dark:bg-gray-700 dark:text-white animate-slide-in-right' : 'bg-message-received text-message-received-foreground dark:bg-gray-700 dark:text-white animate-fade-in'}`}>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed animate-fade-in">
                        {message.image ? <div className="space-y-2">
                            {message.content && typeof message.content === 'string' && message.content !== 'Image uploaded' && <div>{message.content}</div>}
                            <img src={message.image} alt="User uploaded image" className="max-w-full max-h-48 rounded-md object-contain transition-all duration-300 hover:scale-105" />
                          </div> : renderMessageContent(message.content)}
                      </div>
                      <div className="text-xs opacity-70 mt-2">
                        {formatTime(message.timestamp)}
                      </div>
                    </Card>
                  </div>;
            })}
              
              {isLoading && <div className="flex gap-4 justify-start animate-fade-in">
                  <Avatar className="h-8 w-8 bg-primary/10 border-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </Avatar>
                  <Card className="bg-message-received text-message-received-foreground p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </Card>
                </div>}
            </div>
            </ScrollArea>}
        </div>
        
        <div className="min-h-[120px]">
          {/* Input Area - Fixed */}
          <div className="fixed bottom-0 right-0 border-t border-border bg-card p-2 sm:p-4 h-32 z-20" style={{
          left: sidebarCollapsed ? '0' : '320px'
        }}>
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center">
              <div className="flex gap-3 items-end">
                <input type="file" accept="image/*" className="hidden" id="image-upload" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = e => {
                    setUploadedImage(e.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                  toast.success(`Selected: ${file.name}`);
                }
              }} />
                <input type="file" accept=".txt,.doc,.docx,.pdf" className="hidden" id="text-upload" onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = e => {
                    const content = e.target?.result as string;
                    setInput(prev => prev + (prev ? '\n' : '') + content);
                  };
                  reader.readAsText(file);
                  toast.success(`Selected: ${file.name}`);
                }
              }} />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-[80px] w-[80px] text-muted-foreground hover:text-foreground">
                      <Plus className="h-12 w-12" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="start">
                    <div className="space-y-1">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start h-auto p-3 text-left"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <Image className="h-4 w-4 mr-3" />
                        <div>
                          <div className="font-medium">Image</div>
                          <div className="text-xs text-muted-foreground">Upload an image file</div>
                        </div>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start h-auto p-3 text-left"
                        onClick={() => document.getElementById('text-upload')?.click()}
                      >
                        <FileText className="h-4 w-4 mr-3" />
                        <div>
                          <div className="font-medium">Text File</div>
                          <div className="text-xs text-muted-foreground">Upload a text document</div>
                        </div>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="flex-1">
                  <Textarea ref={textareaRef} placeholder="Type your message here..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} className="min-h-[40px] max-h-[72px] resize-none overflow-y-auto scrollbar-hide border-border focus-visible:ring-0" disabled={isLoading} />
                  {uploadedImage && <div className="mt-1 p-1 bg-muted/50 rounded-md border border-border max-w-32">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Image</span>
                        <Button variant="ghost" size="sm" onClick={() => setUploadedImage(null)} className="h-4 w-4 p-0 hover:bg-destructive/20">
                          <X className="h-2 w-2" />
                        </Button>
                      </div>
                      <img src={uploadedImage} alt="Uploaded preview" className="max-w-full h-12 rounded-sm object-contain" />
                    </div>}
                </div>
                <Button onClick={sendMessage} disabled={!input.trim() && !uploadedImage || isLoading} size="lg" className="h-[60px] px-6 bg-transparent hover:bg-transparent border-none shadow-none">
                  {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-black dark:text-white" /> : <Send className="h-8 w-8 text-black dark:text-white" />}
                </Button>
              </div>
              
              {!apiKey && <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">
                     Please set your OpenAI API key in settings to start chatting
                   </p>
                 </div>}
               
               <div className="mt-3 text-center">
                 <p className="text-xs text-muted-foreground">
                   Developed by Ninio • All rights reserved
                 </p>
               </div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
 };
export default OpenAIChatbot;