// ============================================================
// pages/chatbot.jsx - Permission-controlled bilingual assistant
// ============================================================

const KinderVaultChatbot = ({currentUser, lang, onNavigate}) => {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [messages, setMessages] = React.useState([
    {id:"welcome",role:"assistant",translationKey:"Hi! I'm your KinderVault Assistant. You can ask me naturally in English, BM, or bahasa pasar. What would you like help with today?"},
  ]);
  const endRef = React.useRef(null);

  const defaultSuggestions = [
    "What can this system do?",
    "Give me a system summary",
    "How many students are there?",
    "Who has not paid this month?",
    "How do roles and permissions work?",
  ];

  React.useEffect(() => {
    if (open) endRef.current?.scrollIntoView({behavior:"smooth",block:"nearest"});
  }, [messages, sending, open]);

  React.useEffect(() => {
    if (!open) return;
    const closeOnEscape = event => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const clearConversation = () => {
    setMessages([{id:"welcome",role:"assistant",translationKey:"Hi! I'm your KinderVault Assistant. You can ask me naturally in English, BM, or bahasa pasar. What would you like help with today?"}]);
    setInput("");
  };

  const submitMessage = async (suggestedText = null) => {
    const text = String(suggestedText ?? input).trim();
    if (!text || sending) return;
    const userMessage = {id:`user-${Date.now()}`,role:"user",text};
    setMessages(previous => [...previous,userMessage]);
    setInput("");
    setSending(true);
    try {
      const response = await api.post("api/chatbot.php", {message:text,locale:lang});
      if (response.error) throw new Error(response.error);
      setMessages(previous => [...previous,{
        id:`assistant-${Date.now()}`,
        role:"assistant",
        text:response.reply || window.kvT("I could not prepare a response."),
        action:response.action || null,
        suggestions:Array.isArray(response.suggestions) ? response.suggestions : [],
        securityBlocked:Boolean(response.security_blocked),
      }]);
    } catch (error) {
      setMessages(previous => [...previous,{
        id:`error-${Date.now()}`,
        role:"assistant",
        error:true,
        text:error.message || window.kvT("The assistant is unavailable right now. Please try again."),
      }]);
    } finally {
      setSending(false);
    }
  };

  const followAction = (action) => {
    if (!action?.route || typeof onNavigate !== "function") return;
    onNavigate(action.route);
    setOpen(false);
  };

  const onComposerKeyDown = event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  };

  return <>
    {open && <section className="kv-chatbot-panel" role="dialog" aria-modal="false" aria-label={window.kvT("KinderVault Assistant")}>
      <header className="kv-chatbot-header">
        <div className="kv-chatbot-avatar"><i className="ti ti-robot" aria-hidden="true"/></div>
        <div><strong>{window.kvT("KinderVault Assistant")}</strong><span><i aria-hidden="true"/> {window.kvT("English, BM & bahasa pasar")}</span></div>
        <button type="button" className="kv-icon-btn" onClick={clearConversation} title={window.kvT("Clear conversation")} aria-label={window.kvT("Clear conversation")}><i className="ti ti-trash" aria-hidden="true"/></button>
        <button type="button" className="kv-icon-btn" onClick={()=>setOpen(false)} title={window.kvT("Close assistant")} aria-label={window.kvT("Close assistant")}><i className="ti ti-x" aria-hidden="true"/></button>
      </header>

      <div className="kv-chatbot-messages" aria-live="polite">
        {messages.map(message => <div className={`kv-chatbot-message-row is-${message.role}`} key={message.id}>
          {message.role === "assistant" && <div className="kv-chatbot-mini-avatar"><i className="ti ti-robot" aria-hidden="true"/></div>}
          <div className={`kv-chatbot-message${message.error ? " is-error" : ""}${message.securityBlocked ? " is-security" : ""}`}>
            {message.securityBlocked && <div className="kv-chatbot-security-notice"><i className="ti ti-shield-lock" aria-hidden="true"/> {window.kvT("Security protection")}</div>}
            <div>{message.translationKey ? window.kvT(message.translationKey) : message.text}</div>
            {message.action && <button type="button" className="kv-chatbot-action" onClick={()=>followAction(message.action)}>{window.kvT(message.action.label || "Open")} <i className="ti ti-arrow-right" aria-hidden="true"/></button>}
            {message.suggestions?.length > 0 && <div className="kv-chatbot-inline-suggestions">{message.suggestions.map(suggestion=><button type="button" key={suggestion} onClick={()=>submitMessage(window.kvT(suggestion))} disabled={sending}>{window.kvT(suggestion)}</button>)}</div>}
          </div>
        </div>)}
        {sending && <div className="kv-chatbot-message-row is-assistant"><div className="kv-chatbot-mini-avatar"><i className="ti ti-robot" aria-hidden="true"/></div><div className="kv-chatbot-message kv-chatbot-typing" aria-label={window.kvT("Thinking...")}><i/><i/><i/></div></div>}
        <div ref={endRef}/>
      </div>

      {messages.length === 1 && <div className="kv-chatbot-suggestions"><span>{window.kvT("Try asking")}</span><div>{defaultSuggestions.map(suggestion=><button type="button" key={suggestion} onClick={()=>submitMessage(window.kvT(suggestion))} disabled={sending}>{window.kvT(suggestion)}</button>)}</div></div>}

      <form className="kv-chatbot-composer" onSubmit={event=>{event.preventDefault();submitMessage();}}>
        <textarea value={input} onChange={event=>setInput(event.target.value)} onKeyDown={onComposerKeyDown} maxLength="500" rows="2" placeholder={window.kvT("Ask in English, BM, or bahasa pasar...")} aria-label={window.kvT("Chatbot message")}/>
        <button type="submit" disabled={sending || !input.trim()} title={window.kvT("Send message")} aria-label={window.kvT("Send message")}><i className="ti ti-send-2" aria-hidden="true"/></button>
      </form>
      <footer>{window.kvT("Read-only answers follow {user}'s permissions.", {user:currentUser?.full_name || window.kvT("your account")})}</footer>
    </section>}

    <button type="button" className={`kv-chatbot-launcher${open ? " is-open" : ""}`} onClick={()=>setOpen(previous=>!previous)} aria-expanded={open} aria-label={window.kvT(open ? "Close assistant" : "Open KinderVault Assistant")} title={window.kvT(open ? "Close assistant" : "Open KinderVault Assistant")}>
      <i className={`ti ti-${open ? "x" : "message-chatbot"}`} aria-hidden="true"/>
      {!open && <span>{window.kvT("Ask KinderVault")}</span>}
    </button>
  </>;
};
