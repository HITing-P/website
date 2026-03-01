import { useState, useEffect, useRef } from 'react';

type PromptData = {
  id: string;
  keyName: string;
  jsKey: string;
  duration: number;
};

// Available keys to generate instructions for
const KEY_MAPPINGS = [
  { keyName: "'ESC'", jsKey: 'escape' },
  { keyName: "'I'", jsKey: 'i' },
  { keyName: "<SPACEBAR>", jsKey: ' ' },
  { keyName: "'M'", jsKey: 'm' },
  { keyName: "'A'", jsKey: 'a' },
  { keyName: "'W'", jsKey: 'w' },
  { keyName: "'S'", jsKey: 's' },
  { keyName: "'D'", jsKey: 'd' },
  { keyName: "'E'", jsKey: 'e' },
  { keyName: "<ENTER>", jsKey: 'enter' },
  { keyName: "<TAB>", jsKey: 'tab' },
  { keyName: "'Q'", jsKey: 'q' },
  { keyName: "'R'", jsKey: 'r' },
  { keyName: "'P'", jsKey: 'p' },
  { keyName: "'L'", jsKey: 'l' },
];

const generatePrompt = (): PromptData => {
  const mapping = KEY_MAPPINGS[Math.floor(Math.random() * KEY_MAPPINGS.length)];
  const duration = Math.floor(Math.random() * 235) + 15; // Random duration between 15ms and 250ms
  return {
    id: Math.random().toString(36).substring(7),
    keyName: mapping.keyName,
    jsKey: mapping.jsKey,
    duration,
  };
};

type AppPhase = 'booting' | 'blank' | 'terminal-ready' | 'terminal-active';

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('booting');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fadeComplete, setFadeComplete] = useState(false);

  // Randomize Employee # from 1 to 601
  const [employeeId] = useState(() => Math.floor(Math.random() * 601) + 1);

  // Start with empty history and a fresh active prompt
  const [history, setHistory] = useState<PromptData[]>([]);
  const [activePrompt, setActivePrompt] = useState<PromptData | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Boot sequence - fade in completion
  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeComplete(true);
    }, 600); // Wait 0.6s for fade in to complete
    return () => clearTimeout(timer);
  }, []);

  // Boot sequence - loading progress
  useEffect(() => {
    if (phase !== 'booting') return;

    let progress = 0;
    const interval = setInterval(() => {
      // Chunked, snapping progress increments
      progress += Math.floor(Math.random() * 15) + 5;
      
      // Ensure loading doesn't finish before fade-in is complete
      if (progress >= 100) {
        if (!fadeComplete) {
           progress = 99; // Hold at 99% if fade isn't done
        } else {
           progress = 100;
           setLoadingProgress(100);
           clearInterval(interval);
           
           // Snap to blank screen immediately when loading hits 100% and fade is complete
           setPhase('blank');
           return;
        }
      }
      setLoadingProgress(progress);
    }, 200);

    return () => clearInterval(interval);
  }, [phase, fadeComplete]);

  // Transitions: blank -> terminal-ready -> terminal-active
  useEffect(() => {
    if (phase === 'blank') {
      const timer = setTimeout(() => {
        setPhase('terminal-ready');
      }, 1000); // 1 second blank screen
      return () => clearTimeout(timer);
    }
    
    if (phase === 'terminal-ready') {
      const timer = setTimeout(() => {
        setActivePrompt(generatePrompt());
        setPhase('terminal-active');
      }, 1000); // 1 second delay before first instruction appears
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Snap-scroll to bottom (no smooth scrolling)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, activePrompt]);

  // References for duration holding logic
  const activePromptRef = useRef<PromptData | null>(null);
  useEffect(() => {
    activePromptRef.current = activePrompt;
  }, [activePrompt]);

  const keyDownTimeRef = useRef<{ [key: string]: number }>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle keyboard input
  useEffect(() => {
    if (phase !== 'terminal-active') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ([' ', 'Tab', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }

      const active = activePromptRef.current;
      if (!active) return;

      const jsKey = e.key.toLowerCase();
      const expectedKey = active.jsKey.toLowerCase();

      // Start timer if correct key is pressed and wasn't already held down
      if (jsKey === expectedKey && !keyDownTimeRef.current[jsKey]) {
        keyDownTimeRef.current[jsKey] = Date.now();
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        // Timer for exact required duration
        timeoutRef.current = setTimeout(() => {
          // If key is still held in the ref map, success!
          if (keyDownTimeRef.current[jsKey]) {
            setHistory((prev) => [...prev, active]);
            setActivePrompt(generatePrompt());
            
            // NOTE: We do NOT remove the key from keyDownTimeRef yet.
            // This forces the user to fully release the key and press it 
            // again if the next prompt happens to ask for the same key.
          }
        }, active.duration);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const jsKey = e.key.toLowerCase();
      if (keyDownTimeRef.current[jsKey]) {
        delete keyDownTimeRef.current[jsKey];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [phase]);

  const formattedId = employeeId.toString().padStart(3, '0');
  const is427 = employeeId === 427;

  // Render the boot screen
  if (phase === 'booting') {
    const filledBlocks = Math.floor(loadingProgress / 5);
    const emptyBlocks = 20 - filledBlocks;
    // Terminal style loading bar [████████..........]
    const loadingBar = `[${'█'.repeat(filledBlocks)}${'.'.repeat(emptyBlocks)}] ${loadingProgress}%`;

    return (
      <div className="crt-screen text-[20px] md:text-[24px] lg:text-[28px] font-medium leading-relaxed glow-text flex flex-col items-center justify-center animate-fade-in">
        <div className="crt-vignette"></div>
        <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col gap-12 text-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl tracking-widest text-[#4af626]">
              Welcome, Employee #{formattedId}!{is427 && ' 🥳'}
            </h1>
            <h2 className="text-xl md:text-3xl text-[#4af626] opacity-80 uppercase tracking-[0.2em]">
              Office Co. Instructional Prompts
            </h2>
          </div>
          <div className="text-2xl md:text-4xl tracking-[0.3em] text-[#4af626] whitespace-pre">
            {loadingBar}
          </div>
        </div>
      </div>
    );
  }

  // Render blank screen state
  if (phase === 'blank') {
    return (
      <div className="crt-screen">
        <div className="crt-vignette"></div>
      </div>
    );
  }

  // Render the main instructional prompt terminal
  return (
    <div className="crt-screen text-[20px] md:text-[24px] lg:text-[28px] font-medium leading-relaxed glow-text flex flex-col items-center">
      <div className="crt-vignette"></div>
      
      <div className="w-full max-w-6xl w-full flex flex-col h-[90vh] p-4 md:p-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-2 tracking-widest text-[#4af626] whitespace-nowrap overflow-hidden">
          <span>&gt;-Employee #{formattedId}{is427 && ' 🥳'} Instructional Prompt</span>
          <span>v. 1.81.7+</span>
        </div>
        
        {/* Solid Divider */}
        <div className="border-b-[3px] border-[#4af626] w-full mb-8 opacity-90 shadow-[0_0_10px_rgba(74,246,38,0.5)]"></div>
        
        {/* Main Content Area - Scrollable */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto pr-4 flex flex-col gap-8 pb-32"
          /* Note: No smooth scroll style applied, defaults to auto (snapping) */
        >
          
          {/* Historical Instructions */}
          {history.map((prompt) => (
            <div key={prompt.id} className="flex flex-col">
              <span className="opacity-80 tracking-widest mb-1">---</span>
              <span className="tracking-wide">
                &gt; Please PRESS {prompt.keyName} on your KEYBOARD for {prompt.duration}ms.
              </span>
            </div>
          ))}
          
          {/* Active Instruction (Current) */}
          {activePrompt && (
            <div className="flex flex-col">
              <span className="opacity-80 tracking-widest mb-1">---</span>
              <span className="tracking-wide">
                &gt; Please PRESS {activePrompt.keyName} on your KEYBOARD for {activePrompt.duration}ms.
              </span>
            </div>
          )}

          {/* User Input Prompt */}
          <div className="flex flex-col mt-2">
             <span className="opacity-80 tracking-widest mb-1">---</span>
             <span className="flex items-center tracking-wide">
               &gt; <span className="inline-block w-[14px] h-[24px] bg-[#4af626] ml-3 animate-blink-snap"></span>
             </span>
          </div>

        </div>
      </div>
    </div>
  );
}