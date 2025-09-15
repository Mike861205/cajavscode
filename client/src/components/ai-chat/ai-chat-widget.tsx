import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X, Minimize2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Web Speech API support

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "¡Hola! Soy tu asistente de Caja SAS Enterprise. Puedo ayudarte con consultas sobre ventas, inventario, productos, caja y mucho más. ¿En qué puedo asistirte hoy?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [recognitionActive, setRecognitionActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTranscriptRef = useRef<string>("");
  const isListeningRef = useRef<boolean>(false);
  const queryClient = useQueryClient();

  // Obtener contexto del negocio
  const { data: context } = useQuery({
    queryKey: ["/api/ai-chat/context"],
    enabled: isOpen
  });

  // Función para limpiar temporizadores
  const clearTimers = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxTimeTimerRef.current) {
      clearTimeout(maxTimeTimerRef.current);
      maxTimeTimerRef.current = null;
    }
  };

  // Función para limpiar texto repetitivo
  const cleanTranscript = (text: string): string => {
    // Remover espacios extra y limpiar texto básico
    let cleanedText = text.trim().replace(/\s+/g, ' ');
    
    // Remover patrones repetitivos simples como "palabra palabra palabra"
    const words = cleanedText.split(' ');
    const cleanedWords = [];
    let lastWord = '';
    
    for (const word of words) {
      if (word.toLowerCase() !== lastWord.toLowerCase()) {
        cleanedWords.push(word);
        lastWord = word;
      }
    }
    
    cleanedText = cleanedWords.join(' ');
    
    // Remover patrones repetitivos en cadenas como "MarciaMarciaMarcia"
    // Detectar si la misma secuencia se repite
    const halfLength = Math.floor(cleanedText.length / 2);
    for (let i = 3; i <= halfLength; i++) {
      const pattern = cleanedText.substring(0, i);
      if (cleanedText.startsWith(pattern + pattern)) {
        cleanedText = pattern;
        break;
      }
    }
    
    return cleanedText.trim();
  };

  // Función para finalizar grabación y enviar mensaje
  const finishRecording = () => {
    clearTimers();
    
    if (recognitionRef.current && (isListening || recognitionActive)) {
      try {
        recognitionRef.current.stop();
        console.log('Deteniendo reconocimiento de voz...');
      } catch (error) {
        console.log('Error al detener reconocimiento:', error);
      }
    }
    
    const finalTranscript = currentTranscriptRef.current.trim();
    if (finalTranscript) {
      setInputValue(finalTranscript);
      setTimeout(() => {
        handleSendMessage(finalTranscript);
      }, 100);
    }
    
    setIsListening(false);
    setRecognitionActive(false);
    isListeningRef.current = false;
    currentTranscriptRef.current = "";
  };

  // Verificar permisos del micrófono
  const checkMicrophonePermission = async () => {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicrophonePermission(permission.state);
        console.log('Estado del permiso del micrófono:', permission.state);
        
        // Escuchar cambios en los permisos
        permission.onchange = () => {
          setMicrophonePermission(permission.state);
          console.log('Permiso del micrófono cambió a:', permission.state);
        };
      }
    } catch (error) {
      console.log('No se pudo verificar el permiso del micrófono:', error);
      setMicrophonePermission('unknown');
    }
  };

  // Inicializar Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      checkMicrophonePermission();
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false; // Grabación no continua para mejor precisión
      recognitionRef.current.interimResults = false; // Solo resultados finales
      recognitionRef.current.lang = 'es-ES';
      recognitionRef.current.maxAlternatives = 1; // Solo la mejor alternativa

      recognitionRef.current.onstart = () => {
        console.log('Reconocimiento de voz iniciado exitosamente');
        setIsListening(true);
        setRecognitionActive(true);
        isListeningRef.current = true;
        currentTranscriptRef.current = "";
        
        // Temporizador máximo de 10 segundos para comandos específicos
        maxTimeTimerRef.current = setTimeout(() => {
          console.log('Tiempo máximo alcanzado (10 segundos)');
          finishRecording();
        }, 10000); // 10 segundos
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        
        // Solo procesar el último resultado
        if (event.results.length > 0) {
          const lastResult = event.results[event.results.length - 1];
          if (lastResult.isFinal) {
            finalTranscript = lastResult[0].transcript.trim();
          }
        }

        // Actualizar transcript solo si hay contenido válido
        if (finalTranscript && finalTranscript.length > 0) {
          // Limpiar texto repetitivo
          const cleanedTranscript = cleanTranscript(finalTranscript);
          currentTranscriptRef.current = cleanedTranscript;
          setInputValue(cleanedTranscript);
          
          console.log('Transcript final limpio:', cleanedTranscript);
          
          // Finalizar inmediatamente después de obtener resultado
          finishRecording();
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event.error);
        clearTimers();
        setIsListening(false);
        setRecognitionActive(false);
        isListeningRef.current = false;
        currentTranscriptRef.current = "";
        
        // Actualizar estado de permisos
        if (event.error === 'not-allowed') {
          setMicrophonePermission('denied');
        }
        
        // Mostrar mensaje específico según el error
        switch (event.error) {
          case 'not-allowed':
            alert('Acceso al micrófono denegado. Por favor, permite el acceso al micrófono en la configuración del navegador.');
            break;
          case 'no-speech':
            console.log('No se detectó ningún habla');
            break;
          case 'audio-capture':
            alert('No se pudo acceder al micrófono. Verifica que esté conectado y funcionando.');
            break;
          case 'network':
            alert('Error de conexión. Verifica tu conexión a internet.');
            break;
          case 'aborted':
            console.log('Reconocimiento de voz cancelado');
            break;
          default:
            console.log('Error de reconocimiento:', event.error);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Reconocimiento de voz terminado, estado isListeningRef:', isListeningRef.current);
        clearTimers();
        setRecognitionActive(false);
        
        // Solo procesar si estábamos escuchando intencionalmente
        if (isListeningRef.current) {
          const finalTranscript = currentTranscriptRef.current.trim();
          if (finalTranscript) {
            setInputValue(finalTranscript);
            setTimeout(() => {
              handleSendMessage(finalTranscript);
            }, 100);
          }
        }
        
        setIsListening(false);
        isListeningRef.current = false;
        currentTranscriptRef.current = "";
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearTimers();
    };
  }, []); // Solo se ejecuta una vez al montar

  // Función para síntesis de voz
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Detener cualquier reproducción anterior
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Función para solicitar permisos de micrófono
  const requestMicrophonePermission = async () => {
    try {
      console.log('Solicitando permiso del micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Detener el stream inmediatamente
      setMicrophonePermission('granted');
      console.log('Permiso del micrófono concedido');
      return true;
    } catch (error: any) {
      console.error('Error al solicitar permisos de micrófono:', error);
      setMicrophonePermission('denied');
      
      if (error.name === 'NotAllowedError') {
        alert('Para usar el reconocimiento de voz, necesitas permitir el acceso al micrófono. Por favor, haz clic en el icono del candado en la barra de direcciones y permite el acceso al micrófono.');
      } else if (error.name === 'NotFoundError') {
        alert('No se detectó ningún micrófono. Por favor, conecta un micrófono y recarga la página.');
      } else {
        alert('Error al acceder al micrófono: ' + error.message);
      }
      return false;
    }
  };

  // Función para iniciar/detener reconocimiento de voz
  const toggleListening = async () => {
    if (!speechSupported) {
      alert('El reconocimiento de voz no está disponible en este navegador. Por favor, usa Chrome, Edge o Safari.');
      return;
    }

    if (isListening) {
      finishRecording();
    } else {
      // Solicitar permisos antes de iniciar
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;

      try {
        currentTranscriptRef.current = "";
        setInputValue("");
        
        // Verificar si ya está activo antes de iniciar
        if (recognitionRef.current && !recognitionActive) {
          try {
            recognitionRef.current.start();
            console.log('Iniciando reconocimiento de voz...');
          } catch (startError: any) {
            console.error('Error al iniciar reconocimiento:', startError);
            setIsListening(false);
            isListeningRef.current = false;
            
            if (startError.name === 'InvalidStateError') {
              console.log('Reconocimiento ya activo, reiniciando...');
              recognitionRef.current.abort();
              setTimeout(() => {
                try {
                  if (recognitionRef.current && !recognitionActive) {
                    recognitionRef.current.start();
                  }
                } catch (retryError) {
                  console.error('Error al reintentar:', retryError);
                  setIsListening(false);
                  isListeningRef.current = false;
                }
              }, 200);
            }
          }
        } else if (recognitionActive) {
          console.log('Reconocimiento ya está activo');
        }
      } catch (error) {
        console.error('Error al iniciar reconocimiento de voz:', error);
        alert('Error al iniciar el reconocimiento de voz. Asegúrate de que tu micrófono esté conectado y los permisos estén habilitados.');
        setIsListening(false);
        isListeningRef.current = false;
      }
    }
  };

  // Función para detener síntesis de voz
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Mutación para enviar mensajes
  const sendMessageMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/ai-chat", { query });
      const data = await response.json();
      return data;
    },
    onSuccess: (data: any, query) => {
      // Añadir respuesta de la IA
      const aiMessage: Message = {
        id: Date.now().toString() + "_ai",
        text: data.response || "No se pudo obtener respuesta.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // Detectar si se creó una cita exitosamente e invalidar cache
      if (data.response && data.response.includes("✅") && data.response.includes("Cita creada exitosamente")) {
        console.log("🔄 Detected successful appointment creation, invalidating appointments cache");
        queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      }
      
      // Detectar si se creó un producto exitosamente e invalidar cache
      if (data.response && data.response.includes("✅") && data.response.includes("Producto creado exitosamente")) {
        console.log("🔄 Detected successful product creation, invalidating products cache");
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      }
      
      // Detectar si se creó un proveedor exitosamente e invalidar cache
      if (data.response && data.response.includes("✅") && data.response.includes("Proveedor creado exitosamente")) {
        console.log("🔄 Detected successful supplier creation, invalidating suppliers cache");
        queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      }
      
      // Detectar si se procesó una venta exitosamente e invalidar cache
      if (data.response && data.response.includes("✅") && data.response.includes("Venta procesada exitosamente")) {
        console.log("🔄 Detected successful sale creation, invalidating sales and dashboard cache");
        queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] }); // Para actualizar stock
      }
      
      // Leer respuesta en voz alta automáticamente
      setTimeout(() => {
        speakText(aiMessage.text);
      }, 500);
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: Date.now().toString() + "_error",
        text: "Disculpa, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (messageText?: string) => {
    const textToSend = messageText || inputValue;
    if (!textToSend.trim()) return;

    // Añadir mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Enviar a la IA
    sendMessageMutation.mutate(textToSend.trim());
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("es-ES", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-12 h-12 sm:w-14 sm:h-14 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0"
        >
          <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:bottom-6 sm:right-6 sm:left-auto z-50">
      <Card className={`w-full sm:w-96 shadow-2xl transition-all duration-300 ${
        isMinimized ? "h-14 sm:h-16" : "h-[85vh] sm:h-[500px] max-h-[600px]"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base truncate">Asistente IA</h3>
              <p className="text-xs opacity-90 truncate">
                {context ? `${(context as any).productsCount} productos • $${(context as any).todaySales} hoy` : "Cargando..."}
              </p>
            </div>
          </div>
          <div className="flex space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 p-1 h-auto w-8 h-8 sm:w-auto sm:h-auto"
            >
              <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 h-auto w-8 h-8 sm:w-auto sm:h-auto"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 h-[calc(100%-8rem)] sm:h-[380px] p-3 sm:p-4">
              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-2 sm:p-3 rounded-lg ${
                        message.isUser
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.isUser ? "text-blue-100" : "text-gray-500"
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {sendMessageMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="p-3 sm:p-4 border-t bg-white">
              <div className="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? "Escuchando..." : "Pregúntame sobre tu negocio..."}
                  className="flex-1 text-sm sm:text-base"
                  disabled={sendMessageMutation.isPending || isListening}
                />
                
                <div className="flex space-x-2 justify-center sm:justify-start">
                  {/* Botón de micrófono */}
                  {speechSupported && (
                    <Button
                      onClick={toggleListening}
                      disabled={sendMessageMutation.isPending}
                      size="sm"
                      className={`w-10 h-10 sm:w-auto sm:h-auto ${
                        isListening 
                          ? "bg-red-600 hover:bg-red-700 animate-pulse" 
                          : microphonePermission === 'denied'
                          ? "bg-red-400 hover:bg-red-500"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                      title={
                        isListening 
                          ? "Detener grabación" 
                          : microphonePermission === 'denied'
                          ? "Permiso de micrófono denegado - Haz clic para solicitar permisos"
                          : microphonePermission === 'granted'
                          ? "Iniciar grabación de voz (permisos concedidos)"
                          : "Iniciar grabación de voz (se solicitarán permisos)"
                      }
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  
                  {/* Botón de control de síntesis de voz */}
                  <Button
                    onClick={isSpeaking ? stopSpeaking : undefined}
                    disabled={!isSpeaking}
                    size="sm"
                    className={`w-10 h-10 sm:w-auto sm:h-auto ${
                      isSpeaking 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                    title={isSpeaking ? "Detener lectura" : "Sin lectura activa"}
                  >
                    {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || sendMessageMutation.isPending || isListening}
                    size="sm"
                    className="w-10 h-10 sm:w-auto sm:h-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Indicador de estado de voz */}
              {(isListening || isSpeaking) && (
                <div className="mt-2 text-xs text-center px-2">
                  {isListening && (
                    <span className="text-red-600 font-medium">
                      🎙️ Grabando... (Máx: 1 min)
                    </span>
                  )}
                  {isSpeaking && (
                    <span className="text-orange-600 font-medium">
                      🔊 Leyendo respuesta...
                    </span>
                  )}
                </div>
              )}
              
              {/* Mensaje de compatibilidad */}
              {!speechSupported ? (
                <div className="mt-2 text-xs text-gray-500 text-center px-2">
                  Reconocimiento de voz no disponible
                </div>
              ) : microphonePermission === 'denied' ? (
                <div className="mt-2 text-xs text-red-500 text-center px-2">
                  ⚠️ Micrófono bloqueado
                </div>
              ) : microphonePermission === 'granted' ? (
                <div className="mt-2 text-xs text-green-600 text-center px-2">
                  ✅ Micrófono listo
                </div>
              ) : microphonePermission === 'prompt' ? (
                <div className="mt-2 text-xs text-blue-500 text-center px-2">
                  🎤 Toca el micrófono
                </div>
              ) : null}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}